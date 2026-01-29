// =======================================================
// COMPLETE ESTABLISHMENT DETAILS JS - ALL FUNCTIONALITY
// =======================================================

// Global helper to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === name + '=') {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
window.getCookie = getCookie;

// =======================================================
// MESSAGE DISMISS FUNCTIONALITY
// =======================================================
window.dismissMessage = function(button) {
    const messageAlert = button.closest('.message-alert');
    messageAlert.classList.add('hiding');
    setTimeout(() => {
        messageAlert.remove();
        const container = document.getElementById('messagesContainer');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 300);
};

// =======================================================
// CART BADGE UPDATE
// =======================================================
window.updateCartBadge = function(count) {
    const badge = document.getElementById('cart-count-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
};

// =======================================================
// SHOW MESSAGE/NOTIFICATION
// =======================================================
function showMessage(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

// =======================================================
// HANDLE MODAL ADD TO CART
// =======================================================
window.handleModalAddToCart = function(button) {
    const modalItemId = document.getElementById('modalItemId');
    const itemId = modalItemId ? modalItemId.value : null;

    if (!itemId) {
        showMessage('Error: Item not found', 'error');
        return;
    }

    if (!IS_USER_AUTHENTICATED) {
        showMessage('Please log in to add items to cart', 'warning');
        window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        return;
    }

    addToCart(itemId, button);
};

// =======================================================
// ADD TO CART - MAIN FUNCTION
// =======================================================
window.addToCart = function(menuItemId, button) {
    const quantityInput = document.querySelector('#itemQuantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    if (quantity < 1) {
        showMessage('Please select at least 1 item', 'warning');
        return;
    }

    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', menuItemId);
    formData.append('quantity', quantity);

    fetch('/cart/add/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server error: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage(data.message || 'Item added to cart!', 'success');

            if (typeof updateCartBadge === 'function') {
                updateCartBadge(data.cart_count);
            }

            if (quantityInput) {
                quantityInput.value = 1;
            }

            closeItemDetailModal();
        } else {
            showMessage(data.message || 'Failed to add item to cart.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred while adding to cart.', 'error');
    })
    .finally(() => {
        button.disabled = false;
        button.innerHTML = originalHTML;
    });
};

// =======================================================
// BUY NOW WITH PAYMONGO GCASH
// =======================================================
window.handleBuyNowGCash = function(buttonElement) {
    const itemDetailModal = document.getElementById('itemDetailModal');
    const modalItemId = itemDetailModal.querySelector('#modalItemId');
    const quantityInput = itemDetailModal.querySelector('#itemQuantity');
    const itemNameDisplay = itemDetailModal.querySelector('#itemDetailModalTitle');

    const itemId = modalItemId ? modalItemId.value : null;
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    const itemName = itemNameDisplay ? itemNameDisplay.textContent : 'Item';

    if (!itemId || isNaN(quantity) || quantity < 1) {
        showMessage('Error: Invalid item selection or quantity.', 'error');
        return;
    }

    if (!IS_USER_AUTHENTICATED) {
        showMessage('Please log in to purchase items.', 'warning');
        window.location.href = LOGIN_REGISTER_URL || '/accounts/login/';
        return;
    }

    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Payment Link...';

    const csrfToken = getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

    fetch('/payment/create-buynow-link/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.checkout_url) {
            showMessage('Redirecting to payment...', 'info');
            setTimeout(() => {
                window.location.href = data.checkout_url;
            }, 1000);
        } else {
            throw new Error(data.message || 'Failed to create payment link');
        }
    })
    .catch(error => {
        console.error('Buy Now Error:', error);
        showMessage('Error: ' + error.message, 'error');
        buttonElement.disabled = false;
        buttonElement.innerHTML = '<i class="fas fa-bolt"></i> Buy Now';
    });
};

// =======================================================
// REVIEW FUNCTIONALITY
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    const reviewModal = document.getElementById('reviewModal');
    const reviewForm = document.getElementById('reviewForm');
    const modalTitle = document.getElementById('reviewModalTitle');
    const modalStars = document.getElementById('modalStars');
    const ratingInput = document.getElementById('ratingInput');
    const commentInput = document.getElementById('commentInput');
    const addReviewBtn = document.getElementById('addReviewBtn');
    const filterButtons = document.querySelectorAll('.review-filter-btn');

    const itemDetailModal = document.getElementById('itemDetailModal');
    const modalItemId = document.getElementById('modalItemId');
    const modalItemTitle = document.getElementById('itemDetailModalTitle');
    const modalItemImage = document.getElementById('modalItemImage');
    const modalItemPrice = document.getElementById('modalItemPrice');
    const modalItemDescription = document.getElementById('modalItemDescription');
    const itemQuantityInput = document.getElementById('itemQuantity');

    function updateStarRating(rating) {
        const stars = modalStars.querySelectorAll('i');
        stars.forEach((star, index) => {
            star.className = index < rating ? 'fas fa-star' : 'far fa-star';
        });
    }

    function applyReviewFilter(filterValue) {
        const reviews = document.querySelectorAll('.review-item');
        reviews.forEach(review => {
            if (filterValue === 'all') {
                review.style.display = 'block';
            } else if (filterValue === 'good') {
                const rating = parseInt(review.dataset.rating);
                review.style.display = rating >= 4 ? 'block' : 'none';
            } else if (filterValue === 'bad') {
                const rating = parseInt(review.dataset.rating);
                review.style.display = rating <= 3 ? 'block' : 'none';
            }
        });
    }

    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const filter = this.dataset.filter;
                applyReviewFilter(filter);
            });
        });
    }

    window.openReviewModal = function(isEdit = false, reviewData = {}) {
        if (!IS_USER_AUTHENTICATED) {
            showMessage('⚠️ Please log in to write a review', 'warning');
            window.location.href = '/accounts/login/';
            return;
        }

        if (isEdit) {
            modalTitle.textContent = 'Edit Your Review';
            reviewForm.action = BASE_URL_ROOT + 'edit_review/' + reviewData.id + '/';
            commentInput.value = reviewData.comment;
            updateStarRating(reviewData.rating);
        } else {
            modalTitle.textContent = 'Write a Review';
            reviewForm.action = BASE_URL_ROOT + 'submit_review/';
            commentInput.value = '';
            updateStarRating(0);
        }
        reviewModal.style.display = 'block';
    };

    window.closeReviewModal = function() {
        reviewModal.style.display = 'none';
        updateStarRating(0);
        reviewForm.reset();
    };

    if (modalStars) {
        modalStars.addEventListener('mouseover', e => {
            if (e.target.tagName === 'I') {
                const hoverRating = parseInt(e.target.dataset.rating);
                updateStarRating(hoverRating);
            }
        });

        modalStars.addEventListener('click', e => {
            if (e.target.tagName === 'I') {
                const newRating = parseInt(e.target.dataset.rating);
                ratingInput.value = newRating;
                updateStarRating(newRating);
            }
        });

        modalStars.addEventListener('mouseout', () => {
            updateStarRating(parseInt(ratingInput.value));
        });
    }

    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => openReviewModal(false));
    }

    document.body.addEventListener('click', e => {
        if (e.target.classList.contains('edit-review')) {
            const btn = e.target;
            const reviewData = {
                id: btn.dataset.reviewId,
                rating: parseInt(btn.dataset.rating),
                comment: btn.dataset.comment,
            };
            openReviewModal(true, reviewData);
        }

        if (e.target.classList.contains('delete-review')) {
            const reviewId = e.target.dataset.reviewId;
            if (confirm('⚠️ Are you sure you want to delete your review?')) {
                const deleteForm = document.getElementById('delete-review-form');
                deleteForm.action = BASE_URL_ROOT + 'delete_review/' + reviewId + '/';
                deleteForm.submit();
            }
        }
    });

    // =======================================================
    // MENU FILTERING
    // =======================================================
    const menuList = document.getElementById('menuList');
    const allMenuItems = menuList ? Array.from(document.querySelectorAll('.menu-item')) : [];

    window.filterMenuItems = function() {
        const searchInput = document.getElementById('menuSearchInput');
        const priceFilter = document.getElementById('priceFilter');
        const bestSellerFilter = document.getElementById('bestSellerFilter');

        if (!searchInput || !priceFilter || !bestSellerFilter) return;

        const searchText = searchInput.value.toLowerCase();
        const priceValue = priceFilter.value;
        const isBestSellerFilterActive = bestSellerFilter.classList.contains('active');
        const itemsToShow = [];

        allMenuItems.forEach(item => {
            const itemName = item.querySelector('.menu-name').textContent.toLowerCase();
            const itemDescription = item.querySelector('.menu-description').textContent.toLowerCase();
            const isTopSeller = item.dataset.isTopSeller === 'true';

            const matchesSearch = itemName.includes(searchText) || itemDescription.includes(searchText);
            const matchesBestSeller = !isBestSellerFilterActive || isTopSeller;

            if (matchesSearch && matchesBestSeller) {
                itemsToShow.push(item);
            }
        });

        if (priceValue === 'highest') {
            itemsToShow.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
        } else if (priceValue === 'lowest') {
            itemsToShow.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
        }

        if (menuList) {
            menuList.innerHTML = '';
            if (itemsToShow.length > 0) {
                itemsToShow.forEach(item => menuList.appendChild(item));
                const noItemsMsg = document.getElementById('noMenuItemsFound');
                if (noItemsMsg) noItemsMsg.style.display = 'none';
            } else {
                const noItemsMsg = document.getElementById('noMenuItemsFound');
                if (noItemsMsg) noItemsMsg.style.display = 'block';
            }
        }
    };

    window.toggleBestSellerFilter = function() {
        const button = document.getElementById('bestSellerFilter');
        if (button) {
            button.classList.toggle('active');
            button.setAttribute('aria-pressed', button.classList.contains('active'));
            filterMenuItems();
        }
    };

    // =======================================================
    // ITEM DETAIL MODAL
    // =======================================================
    window.openItemDetailModal = function(menuItemElement) {
        const itemId = menuItemElement.dataset.itemId;
        const itemName = menuItemElement.dataset.itemName;
        const itemPrice = menuItemElement.dataset.price;
        const itemDescription = menuItemElement.dataset.itemDescription;
        const itemImageUrl = menuItemElement.dataset.itemImageUrl;
        const itemQuantity = parseInt(menuItemElement.dataset.itemQuantity) || 0;

        if (modalItemId) modalItemId.value = itemId;
        if (modalItemTitle) modalItemTitle.textContent = itemName;
        if (modalItemImage) modalItemImage.src = itemImageUrl;
        if (modalItemPrice) modalItemPrice.textContent = '₱ ' + parseFloat(itemPrice).toFixed(2);
        if (modalItemDescription) modalItemDescription.textContent = itemDescription;
        if (itemQuantityInput) itemQuantityInput.value = 1;

        const stockDisplay = document.getElementById('modalItemStock');
        if (stockDisplay) {
            if (itemQuantity > 0) {
                stockDisplay.innerText = itemQuantity + (itemQuantity === 1 ? ' Item' : ' Items');
                stockDisplay.style.color = '#28a745';
            } else {
                stockDisplay.innerText = 'Out of Stock';
                stockDisplay.style.color = '#dc3545';
            }
        }

        const addToCartBtn = document.getElementById('modalAddToCartBtn');
        const buyNowBtn = document.getElementById('modalBuyNowBtn');

        if (itemQuantity <= 0) {
            if (addToCartBtn) {
                addToCartBtn.disabled = true;
                addToCartBtn.style.opacity = '0.5';
            }
            if (buyNowBtn) {
                buyNowBtn.disabled = true;
                buyNowBtn.style.opacity = '0.5';
            }
        } else {
            if (addToCartBtn) {
                addToCartBtn.disabled = false;
                addToCartBtn.style.opacity = '1';
            }
            if (buyNowBtn) {
                buyNowBtn.disabled = false;
                buyNowBtn.style.opacity = '1';
            }
        }

        if (itemDetailModal) itemDetailModal.style.display = 'block';
    };

    window.closeItemDetailModal = function() {
        if (itemDetailModal) itemDetailModal.style.display = 'none';
    };

    window.updateModalQuantity = function(change) {
        if (!itemQuantityInput) return;
        let currentQuantity = parseInt(itemQuantityInput.value);
        let newQuantity = currentQuantity + change;
        if (newQuantity < 1) newQuantity = 1;
        itemQuantityInput.value = newQuantity;
    };

    window.onclick = function(event) {
        if (reviewModal && event.target == reviewModal) closeReviewModal();
        if (itemDetailModal && event.target == itemDetailModal) closeItemDetailModal();
    };

    applyReviewFilter('all');
});

console.log('✅ Establishment details JS loaded successfully');