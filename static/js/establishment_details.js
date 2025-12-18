// =======================================================
// FIXED ESTABLISHMENT DETAILS JS - PAYMENT INTEGRATION
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

        // Remove container if no messages left
        const container = document.getElementById('messagesContainer');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 300);
};

// ❌ REMOVED: Auto-dismiss messages functionality
// Messages will now persist until manually closed by the user
document.addEventListener('DOMContentLoaded', function() {
    // No auto-dismiss code here anymore
    console.log('✅ Messages will persist until manually closed');
});

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
// CLEAR CART AND RE-ADD (Cross-establishment handling)
// =======================================================
window.clearCartAndReadd = function(itemId, csrfToken, button, quantity) {
    return fetch(CLEAR_CART_URL, {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Old cart cleared');
            return window.addToCart(itemId, quantity, csrfToken, button, 'Item', 'add');
        } else {
            throw new Error(data.message || 'Failed to clear cart');
        }
    });
};

// =======================================================
// ADD TO CART (FIXED)
// =======================================================
window.addToCart = function(itemId, quantity, csrfToken, buttonElement, itemName, action) {
    return new Promise((resolve, reject) => {
        if (!ADD_TO_CART_URL || !VIEW_CART_URL || !CLEAR_CART_URL) {
            alert('Configuration Error: Missing required URLs');
            reject(new Error('Missing URL variables'));
            return;
        }

        // Disable button
        if (buttonElement) {
            buttonElement.dataset.originalText = buttonElement.innerHTML;
            buttonElement.disabled = true;
            buttonElement.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${action === 'buy-now' ? 'Processing...' : 'Adding...'}`;
        }

        const formData = new FormData();
        formData.append('menu_item_id', itemId);
        formData.append('quantity', quantity);

        fetch(ADD_TO_CART_URL, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRFToken': csrfToken },
        })
        .then(response => {
            if (response.status === 409) {
                return response.json().then(error => {
                    error.status = 409;
                    throw error;
                });
            }
            if (!response.ok) {
                return response.json().then(error => {
                    throw error;
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                if (typeof window.updateCartBadge === 'function') {
                    window.updateCartBadge(data.cart_count);
                }

                alert(`✅ Successfully added ${quantity}x ${itemName} to cart`);

                if (action === 'buy-now') {
                    window.location.href = VIEW_CART_URL;
                }
                resolve();
            } else {
                throw new Error(data.message || 'Error adding item');
            }
        })
        .catch(error => {
            console.error('❌ Add to Cart Error:', error);

            if (error.status === 409) {
                const confirmClear = confirm(
                    `${error.message}\n\nCurrent Cart: ${error.current_establishment}\nNew Item From: ${error.new_establishment}\n\nClear cart and add this item?`
                );

                if (confirmClear) {
                    return window.clearCartAndReadd(itemId, csrfToken, buttonElement, quantity)
                        .then(() => {
                            if (action === 'buy-now') {
                                window.location.href = VIEW_CART_URL;
                            }
                            resolve();
                        })
                        .catch(readdError => {
                            alert('Error during cart operation: ' + readdError.message);
                            reject(readdError);
                        });
                } else {
                    reject(new Error('Cart operation cancelled by user'));
                }
            } else {
                alert(`❌ Error: ${error.message || 'An error occurred'}`);
                reject(error);
            }
        })
        .finally(() => {
            if (buttonElement && !window.location.href.includes(VIEW_CART_URL)) {
                buttonElement.disabled = false;
                buttonElement.innerHTML = buttonElement.dataset.originalText || '<i class="fas fa-cart-plus"></i> Add to Cart';
            }
        });
    });
};

// =======================================================
// BUY NOW WITH PAYMONGO GCASH (FIXED)
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
        alert('Error: Invalid item selection or quantity.');
        return;
    }

    if (!IS_USER_AUTHENTICATED) {
        alert('Please log in to purchase items.');
        window.location.href = LOGIN_REGISTER_URL;
        return;
    }

    // Disable button and show loading
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Payment Link...';

    const csrfToken = window.getCookie('csrftoken');
    const formData = new FormData();
    formData.append('menu_item_id', itemId);
    formData.append('quantity', quantity);

    // ✅ Call the Buy Now specific endpoint
    fetch('/payment/create-buynow-link/', {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': csrfToken }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show confirmation modal before redirecting
            const confirmModal = confirm(
                `You will be redirected to PayMongo to complete your ₱${(data.total_amount || 0).toFixed(2)} payment via GCash.\n\n` +
                `Order Reference: ${data.reference_number}\n\n` +
                `Click OK to proceed to payment.`
            );

            if (confirmModal) {
                // ✅ Redirect to PayMongo checkout page
                window.location.href = data.checkout_url;
            } else {
                // Re-enable button if user cancels
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<i class="fas fa-money-bill"></i> Buy Now (GCash)';
            }
        } else {
            alert('Error: ' + data.message);
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-money-bill"></i> Buy Now (GCash)';
        }
    })
    .catch(error => {
        console.error('Payment Error:', error);
        alert('An error occurred while creating the payment. Please try again.');
        buttonElement.disabled = false;
        buttonElement.innerHTML = '<i class="fas fa-money-bill"></i> Buy Now (GCash)';
    });
};


// =======================================================
// QUICK ADD TO CART (From menu card)
// =======================================================
function handleQuickAddToCart(buttonElement, event) {
    if (event) event.stopPropagation();

    const cardElement = buttonElement.closest('.menu-item');
    const itemId = cardElement ? cardElement.dataset.itemId : null;
    const itemName = cardElement ? cardElement.dataset.itemName : 'Item';

    if (!itemId) {
        alert('❌ Error: Item ID not found');
        return;
    }

    const quantity = 1;
    const csrfToken = window.getCookie('csrftoken');

    if (!csrfToken) {
        alert('❌ Security Error: CSRF token not found. Please reload the page.');
        return;
    }

    window.addToCart(itemId, quantity, csrfToken, buttonElement, itemName, 'add');
}
window.handleQuickAddToCart = handleQuickAddToCart;

// =======================================================
// MODAL ADD TO CART
// =======================================================
function handleModalAddToCart(buttonElement) {
    const itemDetailModal = document.getElementById('itemDetailModal');
    const modalItemId = itemDetailModal.querySelector('#modalItemId');
    const quantityInput = itemDetailModal.querySelector('#itemQuantity');
    const itemNameDisplay = itemDetailModal.querySelector('#itemDetailModalTitle');

    const itemId = modalItemId ? modalItemId.value : null;
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
    const itemName = itemNameDisplay ? itemNameDisplay.textContent : 'Item';
    const action = buttonElement.dataset.action || 'add';

    if (!itemId || isNaN(quantity) || quantity < 1) {
        alert('❌ Error: Invalid item selection or quantity');
        return;
    }

    const csrfToken = window.getCookie('csrftoken');
    if (!csrfToken) {
        alert('❌ Security Error: CSRF token not found. Please reload.');
        return;
    }

    window.addToCart(itemId, quantity, csrfToken, buttonElement, itemName, action)
        .then(() => {
            if (action === 'add') window.closeItemDetailModal();
        })
        .catch(error => {
            const cancelled = error.message === 'Cart operation cancelled by user';
            if (action === 'add' && !cancelled) window.closeItemDetailModal();
        });
}
window.handleModalAddToCart = handleModalAddToCart;

// =======================================================
// REVIEW MODAL FUNCTIONS
// =======================================================
document.addEventListener('DOMContentLoaded', function() {
    const reviewModal = document.getElementById('reviewModal');
    const addReviewBtn = document.getElementById('addReviewBtn');
    const modalStars = document.getElementById('modalStars');
    const ratingInput = document.getElementById('ratingInput');
    const reviewForm = document.getElementById('reviewForm');
    const commentInput = document.getElementById('comment');
    const allReviewsList = document.getElementById('allReviewsList');
    const modalTitle = document.getElementById('modalTitle');
    const filterButtons = document.querySelectorAll('.btn-review-filter');
    const noFilteredReviewsMessage = document.getElementById('noFilteredReviews');
    const noReviewsMessage = document.getElementById('noReviewsMessage');
    const allReviews = allReviewsList ? Array.from(allReviewsList.querySelectorAll('.review-item')) : [];

    const itemDetailModal = document.getElementById('itemDetailModal');
    const modalItemId = document.getElementById('modalItemId');
    const modalItemTitle = document.getElementById('itemDetailModalTitle');
    const modalItemImage = document.getElementById('modalItemImage');
    const modalItemPrice = document.getElementById('modalItemPrice');
    const modalItemDescription = document.getElementById('modalItemDescription');
    const itemQuantityInput = document.getElementById('itemQuantity');

    function updateStarRating(rating) {
        ratingInput.value = rating;
        Array.from(modalStars.children).forEach(star => {
            if (parseInt(star.dataset.rating) <= rating) {
                star.classList.remove('far');
                star.classList.add('fas', 'filled');
            } else {
                star.classList.remove('fas', 'filled');
                star.classList.add('far');
            }
        });
    }

    function applyReviewFilter(filterType) {
        let visibleCount = 0;
        if (noReviewsMessage) noReviewsMessage.style.display = 'none';

        allReviews.forEach(review => {
            const rating = parseInt(review.dataset.rating);
            let show = false;

            if (filterType === 'all') show = true;
            else if (filterType === 'good' && rating >= 4) show = true;
            else if (filterType === 'bad' && rating <= 3) show = true;

            if (show) {
                review.style.display = 'flex';
                visibleCount++;
            } else {
                review.style.display = 'none';
            }
        });

        noFilteredReviewsMessage.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            applyReviewFilter(this.dataset.filter);
        });
    });

    window.openReviewModal = function(isEdit = false, reviewData = {}) {
        if (!IS_USER_AUTHENTICATED) {
            alert('⚠️ Please log in to write a review');
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

    // MENU FILTERING
    const menuList = document.getElementById('menuList');
    const allMenuItems = Array.from(document.querySelectorAll('.menu-item'));

    window.filterMenuItems = function() {
        const searchText = document.getElementById('menuSearchInput').value.toLowerCase();
        const priceFilter = document.getElementById('priceFilter').value;
        const isBestSellerFilterActive = document.getElementById('bestSellerFilter').classList.contains('active');
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

        if (priceFilter === 'highest') {
            itemsToShow.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
        } else if (priceFilter === 'lowest') {
            itemsToShow.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
        }

        menuList.innerHTML = '';
        if (itemsToShow.length > 0) {
            itemsToShow.forEach(item => menuList.appendChild(item));
            document.getElementById('noMenuItemsFound').style.display = 'none';
        } else {
            document.getElementById('noMenuItemsFound').style.display = 'block';
        }
    };

    window.toggleBestSellerFilter = function() {
        const button = document.getElementById('bestSellerFilter');
        button.classList.toggle('active');
        button.setAttribute('aria-pressed', button.classList.contains('active'));
        filterMenuItems();
    };

    // ITEM DETAIL MODAL
    window.openItemDetailModal = function(menuItemElement) {
        const itemId = menuItemElement.dataset.itemId;
        const itemName = menuItemElement.dataset.itemName;
        const itemPrice = menuItemElement.dataset.price;
        const itemDescription = menuItemElement.dataset.itemDescription;
        const itemImageUrl = menuItemElement.dataset.itemImageUrl;
        const itemQuantity = parseInt(menuItemElement.dataset.itemQuantity) || 0;

        modalItemId.value = itemId;
        modalItemTitle.textContent = itemName;
        modalItemImage.src = itemImageUrl;
        modalItemPrice.textContent = '₱ ' + parseFloat(itemPrice).toFixed(2);
        modalItemDescription.textContent = itemDescription;
        itemQuantityInput.value = 1;

        // Update Stock Display (Number only or Out of Stock)
    const stockDisplay = document.getElementById('modalItemStock'); // Siguraduhin na tama ang ID na ito sa HTML mo

    if (stockDisplay) {
        if (itemQuantity > 0) {
            // Dito tinanggal natin ang word na "In Stock", bilang nalang
            stockDisplay.innerText = itemQuantity + (itemQuantity === 1 ? ' Item' : ' Items');
            stockDisplay.style.color = '#28a745'; // Green color for available
        } else {
            stockDisplay.innerText = 'Out of Stock';
            stockDisplay.style.color = '#dc3545'; // Red color for out of stock
        }
    }

        // Disable buttons if out of stock
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

        itemDetailModal.style.display = 'block';
    };

    window.closeItemDetailModal = function() {
        itemDetailModal.style.display = 'none';
    };

    window.updateModalQuantity = function(change) {
        let currentQuantity = parseInt(itemQuantityInput.value);
        let newQuantity = currentQuantity + change;
        if (newQuantity < 1) newQuantity = 1;
        itemQuantityInput.value = newQuantity;
    };

    window.onclick = function(event) {
        if (event.target == reviewModal) closeReviewModal();
        if (event.target == itemDetailModal) closeItemDetailModal();
    };

    applyReviewFilter('all');
});

console.log('✅ Establishment details JS loaded successfully');