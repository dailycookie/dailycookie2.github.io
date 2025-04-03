document.addEventListener('DOMContentLoaded', function() {
    // 단어 카드 관련 요소
    const wordCardsSlider = document.querySelector('.word-cards-slider');
    const wordCards = Array.from(document.querySelectorAll('.word-card'));
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const totalCards = wordCards.length;
    let currentIndex = 0;

    // 북마크 및 공유 버튼
    const bookmarkBtn = document.querySelector('.bookmark-btn');
    const shareBtn = document.querySelector('.share-btn');

    // 탭 메뉴 요소
    const tabItems = document.querySelectorAll('.tab-item');
    
    // 북마크 배열 - 로컬스토리지에서 불러오기
    let bookmarkedWords = JSON.parse(localStorage.getItem('bookmarkedWords')) || [];
    
    // 앱 컨테이너와 원래 컨텐츠 저장
    const appContainer = document.querySelector('.app-container');
    const originalContent = appContainer.innerHTML;
    
    // 현재 활성화된 탭
    let activeTab = 'home';

    // 시간 업데이트
    function updateTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        document.querySelector('.time').textContent = `${hours}:${minutes}`;
    }
    
    // 초기 시간 설정 및 1분마다 업데이트
    updateTime();
    setInterval(updateTime, 60000);

    // 초기 카드 설정
    updateCards();
    updateProgress();

    // 스와이프 관련 변수
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let currentOffset = 0;
    let initialOffset = 0;
    let startTime = 0;

    // 터치 및 마우스 이벤트 추가
    wordCardsSlider.addEventListener('touchstart', handleDragStart, { passive: false });
    wordCardsSlider.addEventListener('touchmove', handleDragMove, { passive: false });
    wordCardsSlider.addEventListener('touchend', handleDragEnd);
    wordCardsSlider.addEventListener('touchcancel', handleDragEnd);
    
    // 마우스 이벤트 전역이 아닌 wordCardsSlider에 직접 연결
    wordCardsSlider.addEventListener('mousedown', handleDragStart);
    // mousemove와 mouseup은 마우스가 슬라이더 밖으로 나가도 동작해야 함
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    // 추가: 마우스가 창 밖으로 나갔을 때도 드래그 종료
    window.addEventListener('mouseleave', handleDragEnd);

    // 키보드 화살표 키 지원
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            goToPrevCard();
        } else if (e.key === 'ArrowRight') {
            goToNextCard();
        }
    });

    // 스와이프 화살표 클릭 지원
    document.querySelector('.swipe-arrow.prev').addEventListener('click', goToPrevCard);
    document.querySelector('.swipe-arrow.next').addEventListener('click', goToNextCard);

    // 드래그 시작 처리
    function handleDragStart(e) {
        // 이미 슬라이드 애니메이션 중이면 무시
        if (document.querySelector('.word-card.animating')) {
            return;
        }

        if (activeTab !== 'home') {
            return; // 홈 탭이 아닐 때는 스와이프 작동 안함
        }

        // 터치 이벤트 처리
        if (e.touches && e.touches[0]) {
            startX = e.touches[0].clientX;
            // 터치 이벤트에서는 기본 동작 방지 (화면 스크롤 방지)
            e.preventDefault();
        } 
        // 마우스 이벤트 처리
        else if (e.clientX) {
            startX = e.clientX;
            e.preventDefault();
            
            // 마우스 오른쪽 버튼 클릭 무시
            if (e.button !== 0) {
                return;
            }
        } else {
            return; // 유효한 이벤트가 아니면 종료
        }
        
        startTime = Date.now();
        isDragging = true;
        
        const activeCard = document.querySelector('.word-card.active');
        if (!activeCard) {
            isDragging = false;
            return;
        }
        
        initialOffset = 0;
        
        // 트랜지션 효과 제거로 부드러운 드래그 시작
        wordCards.forEach(card => {
            card.classList.add('dragging');
            card.style.transition = 'none';
        });
        
        // 슬라이더에 드래깅 클래스 추가
        wordCardsSlider.classList.add('dragging');
        
        // 약간의 지연 후 드래그 클래스 적용 (더 부드러운 시작을 위해)
        requestAnimationFrame(() => {
            document.body.style.cursor = 'grabbing';
        });
    }

    // 드래그 이동 처리
    function handleDragMove(e) {
        if (!isDragging) return;
        
        // 홈 탭이 아닐 때는 스와이프 작동 안함
        if (activeTab !== 'home') {
            return;
        }
        
        let newX;
        
        // 터치 이벤트 처리
        if (e.touches && e.touches[0]) {
            newX = e.touches[0].clientX;
            e.preventDefault(); // 스크롤 방지
        } 
        // 마우스 이벤트 처리
        else if (e.clientX) {
            newX = e.clientX;
            e.preventDefault();
        } else {
            return;
        }
        
        currentX = newX;
        currentOffset = currentX - startX;
        
        // 마지막 카드에서 더 드래그하려는 것 제한
        if ((currentIndex === 0 && currentOffset > 0) || 
            (currentIndex === totalCards - 1 && currentOffset < 0)) {
            // 저항감 추가: 실제 이동거리의 1/4만 적용
            currentOffset = currentOffset / 4;
        }
        
        // 현재, 이전, 다음 카드 위치 조정 (requestAnimationFrame으로 부드럽게)
        moveCards(currentOffset);
    }

    // 카드 이동 로직을 별도 함수로 분리
    function moveCards(offset) {
        requestAnimationFrame(() => {
            const activeCard = document.querySelector('.word-card.active');
            const prevCard = document.querySelector('.word-card.prev');
            const nextCard = document.querySelector('.word-card.next');
            
            if (activeCard) {
                const movePercent = (offset / window.innerWidth) * 100;
                activeCard.style.transform = `translateX(${movePercent}%) rotateY(${-movePercent / 20}deg)`;
                
                // 드래그 방향에 따라 이전/다음 카드 표시 및 회전 효과 추가
                if (offset > 0 && prevCard) {
                    const prevMovePercent = -100 + (offset / window.innerWidth) * 100;
                    const rotateValue = Math.min(5, 5 * (offset / (window.innerWidth * 0.5)));
                    prevCard.style.transform = `translateX(${prevMovePercent}%) scale(${0.8 + (offset / window.innerWidth) * 0.2}) rotate(${-5 + rotateValue}deg)`;
                    prevCard.style.opacity = 0.5 + Math.abs(offset) / window.innerWidth / 1.8;
                } else if (offset < 0 && nextCard) {
                    const nextMovePercent = 100 + (offset / window.innerWidth) * 100;
                    const rotateValue = Math.min(5, 5 * (Math.abs(offset) / (window.innerWidth * 0.5)));
                    nextCard.style.transform = `translateX(${nextMovePercent}%) scale(${0.8 + (Math.abs(offset) / window.innerWidth) * 0.2}) rotate(${5 - rotateValue}deg)`;
                    nextCard.style.opacity = 0.5 + Math.abs(offset) / window.innerWidth / 1.8;
                }
            }
        });
    }

    // 드래그 종료 처리
    function handleDragEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        document.body.style.cursor = '';
        wordCardsSlider.classList.remove('dragging');
        
        // 홈 탭이 아닐 때는 스와이프 작동 안함
        if (activeTab !== 'home') {
            return;
        }
        
        const dragDistance = Math.abs(currentOffset);
        const dragDuration = Date.now() - startTime;
        const dragSpeed = dragDistance / dragDuration;
        
        // 트랜지션 효과 복원 (requestAnimationFrame으로 부드럽게)
        requestAnimationFrame(() => {
            wordCards.forEach(card => {
                card.classList.remove('dragging');
                card.style.transition = ''; // 기본 트랜지션 복원
            });
            
            // 임계값 크게 낮춤: 아주 작은 움직임에도 반응하도록 설정
            // 작은 드래그 거리(innerWidth의 2%)나 빠른 속도로도 카드 전환 가능
            if ((dragDistance > window.innerWidth * 0.02) || (dragSpeed > 0.2 && dragDistance > 5)) {
                if (currentOffset > 0 && currentIndex > 0) {
                    goToPrevCard();
                } else if (currentOffset < 0 && currentIndex < totalCards - 1) {
                    goToNextCard();
                } else {
                    // 경계에 도달했거나 짧은 드래그일 경우 복원 애니메이션
                    resetCards();
                }
            } else {
                // 짧은 드래그일 경우 복원 애니메이션
                resetCards();
            }
        });
        
        currentOffset = 0;
    }

    // 카드 리셋 (복원) 로직을 별도 함수로 분리
    function resetCards() {
        updateCards();
        
        // 약간의 반동 효과 추가
        const activeCard = document.querySelector('.word-card.active');
        if (activeCard && Math.abs(currentOffset) > 10) {
            const direction = currentOffset > 0 ? 3 : -3;
            
            activeCard.classList.add('animating');
            activeCard.style.transform = `translateX(${direction}%)`;
            
            setTimeout(() => {
                activeCard.style.transform = '';
                setTimeout(() => {
                    activeCard.classList.remove('animating');
                }, 300);
            }, 150);
        }
    }

    // 이전 카드로 이동
    function goToPrevCard() {
        if (currentIndex > 0) {
            currentIndex--;
            updateCards();
            updateProgress();
            applyCardAnimation('prev');
        } else {
            // 첫 번째 카드에서 이전으로 스와이프 시 반동 효과
            updateCards();
            const activeCard = document.querySelector('.word-card.active');
            activeCard.style.transform = 'translateX(5%)';
            setTimeout(() => {
                activeCard.style.transform = '';
            }, 300);
        }
    }

    // 다음 카드로 이동
    function goToNextCard() {
        if (currentIndex < totalCards - 1) {
            currentIndex++;
            updateCards();
            updateProgress();
            applyCardAnimation('next');
        } else {
            // 마지막 카드에서 다음으로 스와이프 시 반동 효과
            updateCards();
            const activeCard = document.querySelector('.word-card.active');
            activeCard.style.transform = 'translateX(-5%)';
            setTimeout(() => {
                activeCard.style.transform = '';
            }, 300);
        }
    }

    // 카드 애니메이션 적용
    function applyCardAnimation(direction) {
        const activeCard = document.querySelector('.word-card.active .card-inner');
        if (!activeCard) return;
        
        if (direction === 'next') {
            activeCard.animate([
                { transform: 'translateX(15%) scale(0.95) rotateY(-3deg)' },
                { transform: 'translateX(0) scale(1) rotateY(0)' }
            ], {
                duration: 500,
                easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            });
        } else {
            activeCard.animate([
                { transform: 'translateX(-15%) scale(0.95) rotateY(3deg)' },
                { transform: 'translateX(0) scale(1) rotateY(0)' }
            ], {
                duration: 500,
                easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            });
        }
    }

    // 카드 상태 업데이트
    function updateCards() {
        wordCards.forEach((card, index) => {
            // 모든 클래스 제거
            card.classList.remove('active', 'prev', 'next');
            
            // 현재 카드
            if (index === currentIndex) {
                card.classList.add('active');
            }
            // 이전 카드
            else if (index === currentIndex - 1) {
                card.classList.add('prev');
            }
            // 다음 카드
            else if (index === currentIndex + 1) {
                card.classList.add('next');
            }
        });

        // 스와이프 화살표 업데이트
        updateSwipeArrows();
        
        // 북마크 버튼 상태 업데이트
        updateBookmarkButtonState();
    }

    // 스와이프 화살표 업데이트
    function updateSwipeArrows() {
        const prevArrow = document.querySelector('.swipe-arrow.prev');
        const nextArrow = document.querySelector('.swipe-arrow.next');
        
        if (currentIndex === 0) {
            prevArrow.style.opacity = '0.3';
        } else {
            prevArrow.style.opacity = '1';
        }
        
        if (currentIndex === totalCards - 1) {
            nextArrow.style.opacity = '0.3';
        } else {
            nextArrow.style.opacity = '1';
        }
    }

    // 진행 상태 업데이트
    function updateProgress() {
        const percentage = ((currentIndex + 1) / totalCards) * 100;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${currentIndex + 1}/${totalCards}`;
    }

    // 북마크 버튼 이벤트
    bookmarkBtn.addEventListener('click', function() {
        const activeCard = document.querySelector('.word-card.active');
        const wordText = activeCard.querySelector('.word').textContent;
        const pronunc = activeCard.querySelector('.pronunciation').textContent;
        const typeMeaning = activeCard.querySelector('.type-meaning').textContent;
        const example = activeCard.querySelector('.example').textContent;
        
        // 북마크 토글
        this.classList.toggle('active');
        
        // 북마크된 단어인지 확인
        const wordIndex = bookmarkedWords.findIndex(item => item.word === wordText);
        
        if (this.classList.contains('active')) {
            // 북마크에 추가
            if (wordIndex === -1) {
                bookmarkedWords.push({
                    word: wordText,
                    pronunciation: pronunc,
                    typeMeaning: typeMeaning,
                    example: example
                });
                
                // 로컬 스토리지에 저장
                localStorage.setItem('bookmarkedWords', JSON.stringify(bookmarkedWords));
                showToast(`"${wordText}"를 북마크에 추가했습니다`, 'success');
            }
        } else {
            // 북마크에서 제거
            if (wordIndex !== -1) {
                bookmarkedWords.splice(wordIndex, 1);
                localStorage.setItem('bookmarkedWords', JSON.stringify(bookmarkedWords));
                showToast(`"${wordText}"를 북마크에서 제거했습니다`, 'info');
            }
        }
    });

    // 공유 버튼 이벤트
    shareBtn.addEventListener('click', function() {
        const activeCard = document.querySelector('.word-card.active');
        const wordText = activeCard.querySelector('.word').textContent;
        const meaning = activeCard.querySelector('.type-meaning').textContent;
        
        if (navigator.share) {
            navigator.share({
                title: `${wordText} - 단어 학습 앱`,
                text: `${wordText}: ${meaning}`,
                url: window.location.href
            })
            .then(() => {
                showToast('공유하기 성공!', 'success');
            })
            .catch(() => {
                showToast('공유하기가 취소되었습니다', 'info');
            });
        } else {
            // 웹 공유 API를 지원하지 않는 경우 클립보드에 복사
            const shareText = `${wordText}: ${meaning}`;
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('클립보드에 복사되었습니다', 'success');
            });
        }
    });

    // 탭 메뉴 이벤트
    tabItems.forEach((tab, index) => {
        tab.addEventListener('click', function() {
            tabItems.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabName = this.querySelector('span').textContent;
            
            if (index === 0) {
                // 홈 탭 (기본 화면)
                activeTab = 'home';
                showHomeTab();
            } else if (index === 1) {
                // 북마크 탭
                activeTab = 'bookmark';
                showBookmarkTab();
            } else if (index === 2) {
                // 설정 탭
                activeTab = 'settings';
                showToast('설정 기능은 준비 중입니다', 'info');
                setTimeout(() => {
                    tabItems[0].click(); // 홈 탭으로 돌아가기
                }, 1500);
            }
        });
    });

    // 토스트 메시지 표시 함수
    function showToast(message, type = 'info') {
        // 기존 토스트 메시지 제거
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 토스트 메시지 생성
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        
        // 메시지 타입에 따른 아이콘 추가
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else if (type === 'error') {
            iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else {
            iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 16h-2v-6h2v6zm0-8h-2v-2h2v2zm-1 14c-2.67 0-8-1.34-8-4v-9.11l8-2.89 8 2.89v9.11c0 2.66-5.33 4-8 4z" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        }
        
        toast.innerHTML = `<div class="toast-icon">${iconSvg}</div><div class="toast-message">${message}</div>`;
        document.body.appendChild(toast);
        
        // 토스트 메시지 표시 및 자동 사라짐
        setTimeout(() => {
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 2500);
        }, 100);
    }

    // 모바일 환경에서 전체 화면 모드 추천
    if (window.innerWidth <= 420) {
        setTimeout(() => {
            showToast('전체 화면으로 보시면 더 좋습니다', 'info');
        }, 2000);
    }

    // 초기 토스트 메시지 표시
    setTimeout(() => {
        showToast('옆으로 스와이프하여 단어를 살펴보세요', 'info');
    }, 1000);

    // 홈 탭 표시
    function showHomeTab() {
        // HTML 복원
        appContainer.innerHTML = originalContent;
        
        // 탭바 활성화 상태 업데이트
        document.querySelectorAll('.tab-item').forEach((tab, index) => {
            if (index === 0) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 이벤트 핸들러 재설정
        bookmarkBtn = document.querySelector('.bookmark-btn');
        shareBtn = document.querySelector('.share-btn');
        
        // 탭 아이템 재설정
        tabItems = document.querySelectorAll('.tab-item');
        
        // 이벤트 리스너들 다시 설정
        initHomeTab();
    }
    
    // 홈 탭 초기화 함수
    function initHomeTab() {
        // 북마크 버튼 이벤트
        bookmarkBtn.addEventListener('click', function() {
            const activeCard = document.querySelector('.word-card.active');
            const wordText = activeCard.querySelector('.word').textContent;
            const pronunc = activeCard.querySelector('.pronunciation').textContent;
            const typeMeaning = activeCard.querySelector('.type-meaning').textContent;
            const example = activeCard.querySelector('.example').textContent;
            
            // 북마크 토글
            this.classList.toggle('active');
            
            // 북마크된 단어인지 확인
            const wordIndex = bookmarkedWords.findIndex(item => item.word === wordText);
            
            if (this.classList.contains('active')) {
                // 북마크에 추가
                if (wordIndex === -1) {
                    bookmarkedWords.push({
                        word: wordText,
                        pronunciation: pronunc,
                        typeMeaning: typeMeaning,
                        example: example
                    });
                    
                    // 로컬 스토리지에 저장
                    localStorage.setItem('bookmarkedWords', JSON.stringify(bookmarkedWords));
                    showToast(`"${wordText}"를 북마크에 추가했습니다`, 'success');
                }
            } else {
                // 북마크에서 제거
                if (wordIndex !== -1) {
                    bookmarkedWords.splice(wordIndex, 1);
                    localStorage.setItem('bookmarkedWords', JSON.stringify(bookmarkedWords));
                    showToast(`"${wordText}"를 북마크에서 제거했습니다`, 'info');
                }
            }
        });

        // 공유 버튼 이벤트
        shareBtn.addEventListener('click', shareWord);
        
        // 탭 메뉴 이벤트
        tabItems.forEach((tab, index) => {
            tab.addEventListener('click', function() {
                tabItems.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const tabName = this.querySelector('span').textContent;
                
                if (index === 0) {
                    // 홈 탭 (기본 화면)
                    activeTab = 'home';
                    showHomeTab();
                } else if (index === 1) {
                    // 북마크 탭
                    activeTab = 'bookmark';
                    showBookmarkTab();
                } else if (index === 2) {
                    // 설정 탭
                    activeTab = 'settings';
                    showToast('설정 기능은 준비 중입니다', 'info');
                    setTimeout(() => {
                        tabItems[0].click(); // 홈 탭으로 돌아가기
                    }, 1500);
                }
            });
        });
        
        // 터치 및 마우스 이벤트 추가
        wordCardsSlider = document.querySelector('.word-cards-slider');
        wordCards = Array.from(document.querySelectorAll('.word-card'));
        progressFill = document.querySelector('.progress-fill');
        progressText = document.querySelector('.progress-text');
        
        wordCardsSlider.addEventListener('touchstart', handleDragStart, { passive: false });
        wordCardsSlider.addEventListener('touchmove', handleDragMove, { passive: false });
        wordCardsSlider.addEventListener('touchend', handleDragEnd);
        wordCardsSlider.addEventListener('touchcancel', handleDragEnd);
        
        // 마우스 이벤트 전역이 아닌 wordCardsSlider에 직접 연결
        wordCardsSlider.addEventListener('mousedown', handleDragStart);
        // mousemove와 mouseup은 마우스가 슬라이더 밖으로 나가도 동작해야 함
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        // 추가: 마우스가 창 밖으로 나갔을 때도 드래그 종료
        window.addEventListener('mouseleave', handleDragEnd);

        // 키보드 화살표 키 지원
        document.addEventListener('keydown', handleKeyNavigation);

        // 스와이프 화살표 클릭 지원 재설정
        document.querySelector('.swipe-arrow.prev').addEventListener('click', goToPrevCard);
        document.querySelector('.swipe-arrow.next').addEventListener('click', goToNextCard);
        
        updateCards();
        updateProgress();
    }
    
    // 북마크 탭 표시
    function showBookmarkTab() {
        // 하단 탭 바 HTML 생성
        const tabBarHTML = `
            <div class="tab-bar">
                <div class="tab-item">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>홈</span>
                </div>
                <div class="tab-item active">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" stroke="#32CD70" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>북마크</span>
                </div>
                <div class="tab-item">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>설정</span>
                </div>
            </div>
        `;

        if (bookmarkedWords.length === 0) {
            appContainer.innerHTML = `
                <div class="bookmark-page">
                    <div class="bookmark-header">
                        <h2>북마크한 단어</h2>
                    </div>
                    <div class="empty-bookmark">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <p>북마크한 단어가 없습니다</p>
                        <button class="return-btn">홈으로 돌아가기</button>
                    </div>
                    ${tabBarHTML}
                </div>
            `;
            
            // 홈 버튼 이벤트
            document.querySelector('.return-btn').addEventListener('click', () => {
                tabItems[0].click();
            });
        } else {
            let bookmarkListHTML = '';
            
            bookmarkedWords.forEach((word, index) => {
                bookmarkListHTML += `
                    <div class="bookmark-item" data-index="${index}">
                        <div class="bookmark-content">
                            <h3>${word.word}</h3>
                            <p>${word.pronunciation}</p>
                            <p>${word.typeMeaning}</p>
                        </div>
                        <button class="remove-bookmark-btn" data-index="${index}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 18L18 6M6 6l12 12" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                `;
            });
            
            appContainer.innerHTML = `
                <div class="bookmark-page">
                    <div class="bookmark-header">
                        <h2>북마크한 단어 (${bookmarkedWords.length})</h2>
                    </div>
                    <div class="bookmark-list">
                        ${bookmarkListHTML}
                    </div>
                    ${tabBarHTML}
                </div>
            `;
            
            // 북마크 삭제 버튼 이벤트
            document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const index = parseInt(this.getAttribute('data-index'));
                    const wordToRemove = bookmarkedWords[index].word;
                    
                    // 배열에서 삭제
                    bookmarkedWords.splice(index, 1);
                    localStorage.setItem('bookmarkedWords', JSON.stringify(bookmarkedWords));
                    
                    showToast(`"${wordToRemove}"를 북마크에서 제거했습니다`, 'info');
                    showBookmarkTab(); // 북마크 페이지 새로고침
                });
            });
            
            // 북마크 항목 클릭 이벤트 - 상세 보기
            document.querySelectorAll('.bookmark-item').forEach(item => {
                item.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const word = bookmarkedWords[index];
                    
                    appContainer.innerHTML = `
                        <div class="bookmark-detail">
                            <div class="bookmark-detail-header">
                                <button class="back-btn">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 19l-7-7 7-7" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                                <h2>단어 상세</h2>
                            </div>
                            <div class="bookmark-detail-card">
                                <h1 class="word">${word.word}</h1>
                                <p class="pronunciation">${word.pronunciation}</p>
                                <div class="card-divider"></div>
                                <div class="meaning-container">
                                    <p class="type-meaning">${word.typeMeaning}</p>
                                    <p class="example">${word.example}</p>
                                </div>
                            </div>
                            ${tabBarHTML}
                        </div>
                    `;
                    
                    // 뒤로 가기 버튼 이벤트
                    document.querySelector('.back-btn').addEventListener('click', () => {
                        showBookmarkTab();
                    });

                    // 상세 페이지의 탭 이벤트 재설정
                    setTabItemEvents();
                });
            });
        }

        // 북마크 페이지의 탭 이벤트 재설정
        setTabItemEvents();
    }
    
    // 탭 이벤트 설정 함수
    function setTabItemEvents() {
        const newTabItems = document.querySelectorAll('.tab-item');
        
        newTabItems.forEach((tab, index) => {
            tab.addEventListener('click', function() {
                newTabItems.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                if (index === 0) {
                    // 홈 탭
                    activeTab = 'home';
                    showHomeTab();
                    initHomeTab(); // 추가: 홈 탭 이벤트 재설정 확실히 하기
                } else if (index === 1) {
                    // 북마크 탭
                    activeTab = 'bookmark';
                    showBookmarkTab();
                } else if (index === 2) {
                    // 설정 탭
                    activeTab = 'settings';
                    showToast('설정 기능은 준비 중입니다', 'info');
                    setTimeout(() => {
                        if (activeTab === 'settings') {
                            activeTab = 'home';
                            showHomeTab();
                            initHomeTab(); // 추가: 설정에서 홈으로 돌아갈 때도 이벤트 재설정
                        }
                    }, 1500);
                }
            });
        });
    }
    
    // 현재 단어의 북마크 상태 업데이트
    function updateBookmarkButtonState() {
        const activeCard = document.querySelector('.word-card.active');
        const newBookmarkBtn = document.querySelector('.bookmark-btn');
        
        if (activeCard && newBookmarkBtn) {
            const wordText = activeCard.querySelector('.word').textContent;
            const isBookmarked = bookmarkedWords.some(item => item.word === wordText);
            
            if (isBookmarked) {
                newBookmarkBtn.classList.add('active');
            } else {
                newBookmarkBtn.classList.remove('active');
            }
        }
    }
    
    // 공유 기능을 분리 함수로 재구성
    function shareWord() {
        const activeCard = document.querySelector('.word-card.active');
        const wordText = activeCard.querySelector('.word').textContent;
        const meaning = activeCard.querySelector('.type-meaning').textContent;
        
        if (navigator.share) {
            navigator.share({
                title: `${wordText} - 단어 학습 앱`,
                text: `${wordText}: ${meaning}`,
                url: window.location.href
            })
            .then(() => {
                showToast('공유하기 성공!', 'success');
            })
            .catch(() => {
                showToast('공유하기가 취소되었습니다', 'info');
            });
        } else {
            // 웹 공유 API를 지원하지 않는 경우 클립보드에 복사
            const shareText = `${wordText}: ${meaning}`;
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('클립보드에 복사되었습니다', 'success');
            });
        }
    }

    // 초기화
    updateBookmarkButtonState();

    // 키보드 네비게이션 지원 추가
    document.addEventListener('keydown', handleKeyNavigation);
    
    // 터치 이벤트 슬라이더에 추가
    const slider = document.querySelector('.word-cards-slider');
    if (slider) {
        slider.addEventListener('touchstart', handleDragStart, { passive: false });
        slider.addEventListener('touchmove', handleDragMove, { passive: false });
        slider.addEventListener('touchend', handleDragEnd, { passive: false });
        slider.addEventListener('touchcancel', handleDragEnd, { passive: false });
        
        // 마우스 이벤트 추가
        slider.addEventListener('mousedown', handleDragStart);
        
        // 접근성 향상을 위한 ARIA 속성 추가
        slider.setAttribute('role', 'region');
        slider.setAttribute('aria-label', '단어 카드 슬라이더');
        
        // 슬라이더 상태 추적을 위한 클래스 토글
        slider.addEventListener('mousedown', () => {
            slider.classList.add('dragging');
        });
        
        window.addEventListener('mouseup', () => {
            slider.classList.remove('dragging');
        });
    }
    
    // 단어 카드에 포커스 가능 속성 추가
    wordCards.forEach((card, index) => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
        card.setAttribute('aria-label', `단어 카드 ${index + 1}/${totalCards}`);
    });
});

// 키보드 네비게이션 핸들러
function handleKeyNavigation(e) {
    // 왼쪽 화살표: 이전 카드
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevCard();
    }
    // 오른쪽 화살표: 다음 카드
    else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextCard();
    }
    // 스페이스: 현재 단어 북마크 토글
    else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (bookmarkBtn) bookmarkBtn.click();
    }
    // B키: 북마크 버튼 클릭
    else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        const tabItems = document.querySelectorAll('.tab-item');
        if (tabItems && tabItems[1]) tabItems[1].click();
    }
    // H키: 홈으로 이동
    else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const tabItems = document.querySelectorAll('.tab-item');
        if (tabItems && tabItems[0]) tabItems[0].click();
    }
    // S키: 설정 탭으로 이동
    else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        const tabItems = document.querySelectorAll('.tab-item');
        if (tabItems && tabItems[2]) tabItems[2].click();
    }
} 