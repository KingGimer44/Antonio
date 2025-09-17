(function () {
  'use strict';

  const grid = document.getElementById('grid');
  const searchInput = document.getElementById('search');
  const genreSelect = document.getElementById('genre');
  const sortSelect = document.getElementById('sort');
  const favToggle = document.getElementById('onlyFavorites');
  const themeToggle = document.getElementById('themeToggle');

  const modal = document.getElementById('detailsModal');
  const closeModalBtn = document.getElementById('closeModal');
  const modalCover = document.getElementById('modalCover');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalYear = document.getElementById('modalYear');
  const modalGenre = document.getElementById('modalGenre');
  const modalPlatforms = document.getElementById('modalPlatforms');
  const modalRating = document.getElementById('modalRating');
  const waInput = document.getElementById('waNumber');
  const sendWaBtn = document.getElementById('sendWhatsAppBtn');
  const quantityInput = document.getElementById('quantity');
  const decreaseQty = document.getElementById('decreaseQty');
  const increaseQty = document.getElementById('increaseQty');
  const addToCartBtn = document.getElementById('addToCartBtn');
  const removeFromCartBtn = document.getElementById('removeFromCartBtn');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');
  console.log('Elements found:', { addToCartBtn: !!addToCartBtn });
  const viewCartBtn = document.getElementById('viewCartBtn');
  const cartModal = document.getElementById('cartModal');
  const closeCartModal = document.getElementById('closeCartModal');
  const cartItems = document.getElementById('cartItems');
  const cartItemsTotal = document.getElementById('cartItemsTotal');
  const cartPriceTotal = document.getElementById('cartPriceTotal');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const waNumberCheckout = document.getElementById('waNumberCheckout');

  const CART_KEY = 'vg_cart';
  const THEME_KEY = 'site_theme';

  const sampleGames = buildSampleGames();
  const cart = new Map(loadCart());
  let currentGame = null;

  initTheme();
  mountFilters();
  updateCartDisplay();
  render();

  // Eventos
  searchInput.addEventListener('input', debounce(render, 150));
  genreSelect.addEventListener('change', render);
  sortSelect.addEventListener('change', render);
  favToggle.addEventListener('change', render);
  themeToggle.addEventListener('click', toggleTheme);
  closeModalBtn.addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  sendWaBtn.addEventListener('click', onSendWhatsApp);
  decreaseQty.addEventListener('click', () => adjustQuantity(-1));
  increaseQty.addEventListener('click', () => adjustQuantity(1));
  // Usar delegación de eventos para los botones del carrito
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'addToCartBtn') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Add to cart button clicked via delegation');
      addToCart();
    } else if (e.target && e.target.id === 'removeFromCartBtn') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Remove from cart button clicked via delegation');
      removeFromCartModal();
    }
  });
  console.log('Event listeners assigned', { addToCartBtn: !!addToCartBtn });
  viewCartBtn.addEventListener('click', openCartModal);
  closeCartModal.addEventListener('click', () => cartModal.close());
  cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.close(); });
  clearCartBtn.addEventListener('click', clearCart);
  checkoutBtn.addEventListener('click', checkoutWithWhatsApp);

  function mountFilters() {
    const genres = Array.from(new Set(sampleGames.map(g => g.genre))).sort();
    for (const genre of genres) {
      const opt = document.createElement('option');
      opt.value = genre; opt.textContent = genre;
      genreSelect.appendChild(opt);
    }
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const selectedGenre = genreSelect.value;
    const sort = sortSelect.value;
    const onlyFav = favToggle.checked;
    grid.setAttribute('aria-busy', 'true');

    let list = sampleGames
      .filter(g => !onlyFav || cart.has(g.id))
      .filter(g => !q || g.title.toLowerCase().includes(q))
      .filter(g => !selectedGenre || g.genre === selectedGenre);

    list = sortList(list, sort);

    grid.innerHTML = '';
    for (const game of list) {
      const card = createCard(game);
      grid.appendChild(card);
    }
    grid.setAttribute('aria-busy', 'false');
  }

  function sortList(list, rule) {
    const copy = [...list];
    switch (rule) {
      case 'rating-desc':
        return copy.sort((a, b) => b.rating - a.rating);
      case 'year-desc':
        return copy.sort((a, b) => b.year - a.year);
      case 'title-asc':
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return copy;
    }
  }

  function createCard(game) {
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.gameId = game.id;

    const cartBtn = document.createElement('button');
    cartBtn.className = 'btn cart';
    cartBtn.setAttribute('aria-label', cart.has(game.id) ? 'Quitar del carrito' : 'Agregar al carrito');
    cartBtn.textContent = cart.has(game.id) ? '✅' : '🛒';
    if (cart.has(game.id)) cartBtn.classList.add('active');
    cartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCart(game.id, cartBtn);
    });

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.appendChild(cartBtn);

    const img = document.createElement('img');
    img.className = 'cover';
    img.alt = `Portada de ${game.title}`;
    setImageWithFallback(img, game.preferredCovers, game.fallbackCover);

    const content = document.createElement('div');
    content.className = 'content';

    const h3 = document.createElement('h3');
    h3.className = 'title';
    h3.textContent = game.title;

    const meta = document.createElement('ul');
    meta.className = 'meta';

    const li1 = document.createElement('li');
    li1.innerHTML = `<span class="pill">${game.genre}</span>`;
    const li2 = document.createElement('li');
    li2.textContent = `Año: ${game.year}`;
    const li3 = document.createElement('li');
    li3.textContent = `Puntuación: ${game.rating.toFixed(1)} ⭐`;
    meta.append(li1, li2, li3);

    content.append(h3, meta);
    article.append(actions, img, content);

    article.addEventListener('click', () => openModal(game));
    return article;
  }

  function toggleCart(id, btn) {
    console.log('toggleCart called', { id, hasItem: cart.has(id) });
    if (cart.has(id)) {
      cart.delete(id);
      btn.textContent = '🛒';
      btn.setAttribute('aria-label', 'Agregar al carrito');
    } else {
      cart.set(id, 1);
      btn.textContent = '✅';
      btn.setAttribute('aria-label', 'Quitar del carrito');
    }
    saveCart();
    updateCartDisplay();
    btn.classList.toggle('active', cart.has(id));
    console.log('Cart after toggle:', Array.from(cart.entries()));
    if (favToggle.checked) render();
  }

  function adjustQuantity(delta) {
    const currentValue = parseInt(quantityInput.value) || 1;
    const newValue = Math.max(1, Math.min(10, currentValue + delta));
    quantityInput.value = newValue;
  }

  function addToCart() {
    console.log('addToCart called', { currentGame, quantity: quantityInput.value });
    if (!currentGame) {
      console.log('No currentGame');
      return;
    }
    const quantity = parseInt(quantityInput.value) || 1;
    console.log('Adding to cart:', { gameId: currentGame.id, quantity });
    cart.set(currentGame.id, quantity);
    saveCart();
    updateCartDisplay();
    modal.close();
    if (favToggle.checked) render();
    console.log('Cart after add:', Array.from(cart.entries()));
  }

  function removeFromCartModal() {
    console.log('removeFromCartModal called', { currentGame });
    if (!currentGame) {
      console.log('No currentGame');
      return;
    }
    cart.delete(currentGame.id);
    saveCart();
    updateCartDisplay();
    modal.close();
    if (favToggle.checked) render();
    console.log('Cart after remove:', Array.from(cart.entries()));
  }

  function updateCartDisplay() {
    let totalItems = 0;
    let totalPrice = 0;
    
    for (const [gameId, quantity] of cart.entries()) {
      const game = sampleGames.find(g => g.id === gameId);
      if (game) {
        totalItems += quantity;
        totalPrice += (game.rating * 10) * quantity; // Usar rating como precio base
      }
    }
    
    cartCount.textContent = totalItems;
    cartTotal.textContent = `$${totalPrice.toFixed(2)}`;
    viewCartBtn.disabled = cart.size === 0;
    
    // Actualizar todos los botones del carrito en las tarjetas
    updateAllCartButtons();
  }

  function updateAllCartButtons() {
    // Buscar todos los botones de carrito en las tarjetas
    const cartButtons = document.querySelectorAll('.btn.cart');
    cartButtons.forEach(btn => {
      const card = btn.closest('.card');
      if (card) {
        const gameId = card.dataset.gameId;
        if (gameId) {
          const isInCart = cart.has(gameId);
          btn.textContent = isInCart ? '✅' : '🛒';
          btn.setAttribute('aria-label', isInCart ? 'Quitar del carrito' : 'Agregar al carrito');
          btn.classList.toggle('active', isInCart);
        }
      }
    });
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(Array.from(cart.entries())));
  }
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  }

  function openModal(game) {
    currentGame = game;
    setImageWithFallback(modalCover, game.preferredCovers, game.fallbackCover);
    modalTitle.textContent = game.title;
    modalDesc.textContent = game.description;
    modalYear.textContent = String(game.year);
    modalGenre.textContent = game.genre;
    modalPlatforms.textContent = game.platforms.join(', ');
    modalRating.textContent = game.rating.toFixed(1);
    
    // Reset quantity input
    quantityInput.value = 1;
    
    // Show/hide buttons based on cart status
    const isInCart = cart.has(game.id);
    addToCartBtn.style.display = isInCart ? 'none' : 'block';
    removeFromCartBtn.style.display = isInCart ? 'block' : 'none';
    
    if (isInCart) {
      quantityInput.value = cart.get(game.id) || 1;
    }
    
    console.log('Modal opened for game:', game.title, 'isInCart:', isInCart);
    if (typeof modal.showModal === 'function') modal.showModal();
  }

  async function onSendWhatsApp() {
    const to = String(waInput.value || '').trim();
    if (!/^\+\d{8,15}$/.test(to)) return alert('Número inválido. Usa formato +<código_pais><número>.');

    if (cart.size === 0) return alert('El carrito está vacío. Agrega algunos juegos primero.');

    setSending(true);
    try {
      const cartData = buildCartMessage();
      console.log('[WA][REQUEST]', { to, cart: cartData });
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, cart: cartData })
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log('[WA][RESPONSE]', { status: res.status, data });
      if (!res.ok || !data.ok) throw new Error(data.error || 'Fallo al enviar');
      alert('Mensaje enviado por WhatsApp ✅');
    } catch (err) {
      console.error('[WA][ERROR]', err);
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  function buildCartMessage() {
    let message = '🛒 *Carrito de Videojuegos*\n\n';
    let total = 0;
    
    for (const [gameId, quantity] of cart.entries()) {
      const game = sampleGames.find(g => g.id === gameId);
      if (game) {
        const price = game.rating * 10;
        const subtotal = price * quantity;
        total += subtotal;
        message += `🎮 ${game.title}\n`;
        message += `   Cantidad: ${quantity}\n`;
        message += `   Precio: $${price.toFixed(2)} c/u\n`;
        message += `   Subtotal: $${subtotal.toFixed(2)}\n\n`;
      }
    }
    
    message += `💰 *Total: $${total.toFixed(2)}*`;
    return message;
  }

  function openCartModal() {
    renderCartItems();
    if (typeof cartModal.showModal === 'function') cartModal.showModal();
  }

  function renderCartItems() {
    cartItems.innerHTML = '';
    let totalItems = 0;
    let totalPrice = 0;

    for (const [gameId, quantity] of cart.entries()) {
      const game = sampleGames.find(g => g.id === gameId);
      if (game) {
        const price = game.rating * 10;
        const subtotal = price * quantity;
        totalItems += quantity;
        totalPrice += subtotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
          <img src="${game.preferredCovers[0]}" alt="${game.title}" onerror="this.src='${game.fallbackCover}'">
          <div class="cart-item-info">
            <div class="cart-item-title">${game.title}</div>
            <div class="cart-item-price">$${price.toFixed(2)} c/u</div>
          </div>
          <div class="cart-item-controls">
            <button class="btn qty-btn" onclick="updateCartQuantity('${gameId}', -1)">-</button>
            <input type="number" class="cart-item-qty" value="${quantity}" min="1" max="10" 
                   onchange="updateCartQuantityInput('${gameId}', this.value)">
            <button class="btn qty-btn" onclick="updateCartQuantity('${gameId}', 1)">+</button>
            <button class="cart-item-remove" onclick="removeFromCart('${gameId}')">🗑️</button>
          </div>
        `;
        cartItems.appendChild(cartItem);
      }
    }

    cartItemsTotal.textContent = totalItems;
    cartPriceTotal.textContent = `$${totalPrice.toFixed(2)}`;
  }

  function updateCartQuantity(gameId, delta) {
    const currentQty = cart.get(gameId) || 0;
    const newQty = Math.max(1, Math.min(10, currentQty + delta));
    if (newQty === 0) {
      cart.delete(gameId);
    } else {
      cart.set(gameId, newQty);
    }
    saveCart();
    updateCartDisplay();
    renderCartItems();
    if (favToggle.checked) render();
  }

  function updateCartQuantityInput(gameId, value) {
    const newQty = Math.max(1, Math.min(10, parseInt(value) || 1));
    if (newQty === 0) {
      cart.delete(gameId);
    } else {
      cart.set(gameId, newQty);
    }
    saveCart();
    updateCartDisplay();
    renderCartItems();
    if (favToggle.checked) render();
  }

  function removeFromCart(gameId) {
    cart.delete(gameId);
    saveCart();
    updateCartDisplay();
    renderCartItems();
    if (favToggle.checked) render();
  }

  function clearCart() {
    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      cart.clear();
      saveCart();
      updateCartDisplay();
      renderCartItems();
      if (favToggle.checked) render();
    }
  }

  async function checkoutWithWhatsApp() {
    if (cart.size === 0) {
      alert('El carrito está vacío');
      return;
    }

    const to = String(waNumberCheckout.value || '').trim();
    if (!/^\+\d{8,15}$/.test(to)) {
      alert('Número de WhatsApp inválido. Usa formato +<código_pais><número>.');
      return;
    }

    const totalItems = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0);
    const totalPrice = Array.from(cart.entries()).reduce((sum, [gameId, qty]) => {
      const game = sampleGames.find(g => g.id === gameId);
      return sum + (game ? (game.rating * 10 * qty) : 0);
    }, 0);

    setCheckoutSending(true);
    try {
      const cartData = buildCartMessage();
      console.log('[CHECKOUT][REQUEST]', { to, cart: cartData });
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, cart: cartData })
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      console.log('[CHECKOUT][RESPONSE]', { status: res.status, data });
      if (!res.ok || !data.ok) throw new Error(data.error || 'Fallo al enviar');

      alert('¡Compra realizada exitosamente! 🎉\n\n' +
            `📦 Total de items: ${totalItems}\n` +
            `💰 Total pagado: $${totalPrice.toFixed(2)}\n\n` +
            'Se ha enviado la confirmación por WhatsApp ✅');
      
      // Limpiar carrito después de la compra
      cart.clear();
      saveCart();
      updateCartDisplay();
      renderCartItems();
      cartModal.close();
      if (favToggle.checked) render();
    } catch (err) {
      console.error('[CHECKOUT][ERROR]', err);
      alert('Error al procesar la compra: ' + err.message);
    } finally {
      setCheckoutSending(false);
    }
  }

  function setCheckoutSending(isSending) {
    checkoutBtn.disabled = isSending;
    checkoutBtn.textContent = isSending ? 'Procesando...' : 'Comprar y Enviar';
  }

  // Hacer las funciones globales para que funcionen desde el HTML
  window.updateCartQuantity = updateCartQuantity;
  window.updateCartQuantityInput = updateCartQuantityInput;
  window.removeFromCart = removeFromCart;

  function setSending(isSending) {
    sendWaBtn.disabled = isSending;
    sendWaBtn.textContent = isSending ? 'Enviando...' : 'Enviar';
  }

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    } else {
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }
  function setTheme(theme) {
    document.body.classList.toggle('light', theme === 'light');
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    localStorage.setItem(THEME_KEY, theme);
  }
  function toggleTheme() {
    const isLight = document.body.classList.contains('light');
    setTheme(isLight ? 'dark' : 'light');
  }

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function buildSampleGames() {
    const colors = ['#7c9cff', '#ff8ba7', '#ffcd6b', '#8fd694', '#9b72ff', '#6be5ff'];
    const titles = [
      { t: 'The Legend of Zelda: Breath of the Wild', y: 2017, g: 'Aventura', p: ['Switch', 'Wii U'], r: 9.8 },
      { t: 'God of War', y: 2018, g: 'Acción', p: ['PS4', 'PS5', 'PC'], r: 9.6 },
      { t: 'Red Dead Redemption 2', y: 2018, g: 'Mundo abierto', p: ['PS4', 'Xbox One', 'PC'], r: 9.7 },
      { t: 'Hollow Knight', y: 2017, g: 'Metroidvania', p: ['PC', 'Switch', 'PS4', 'Xbox'], r: 9.1 },
      { t: 'Elden Ring', y: 2022, g: 'RPG', p: ['PC', 'PS5', 'Xbox'], r: 9.5 },
      { t: 'Super Mario Odyssey', y: 2017, g: 'Plataformas', p: ['Switch'], r: 9.4 },
      { t: 'The Witcher 3: Wild Hunt', y: 2015, g: 'RPG', p: ['PC', 'PS4', 'Xbox', 'Switch'], r: 9.3 },
      { t: 'Celeste', y: 2018, g: 'Plataformas', p: ['PC', 'Switch', 'PS4', 'Xbox'], r: 9.0 },
      { t: 'Portal 2', y: 2011, g: 'Puzles', p: ['PC', 'PS3', 'Xbox 360'], r: 9.4 },
      { t: 'Minecraft', y: 2011, g: 'Sandbox', p: ['Todas'], r: 9.2 },
      { t: 'Stardew Valley', y: 2016, g: 'Simulación', p: ['PC', 'Switch', 'PS4', 'Xbox', 'Móvil'], r: 8.9 },
      { t: 'Dark Souls III', y: 2016, g: 'Acción', p: ['PC', 'PS4', 'Xbox One'], r: 9.0 },
      { t: 'Animal Crossing: New Horizons', y: 2020, g: 'Simulación', p: ['Switch'], r: 8.8 },
      { t: 'Hades', y: 2020, g: 'Roguelike', p: ['PC', 'Switch', 'PS', 'Xbox'], r: 9.2 },
      { t: 'Spider-Man 2', y: 2023, g: 'Acción', p: ['PS5'], r: 9.1 }
    ];
    return titles.map((it, idx) => {
      const id = `g_${idx + 1}`;
      const slug = toSlug(it.t);
      const fallbackCover = svgCover(it.t, colors[idx % colors.length]);
      const preferredCovers = [`/img/${slug}.webp`, `/img/${slug}.jpg`, `/img/${slug}.jpeg`, `/img/${slug}.png`];
      return {
        id,
        title: it.t,
        year: it.y,
        genre: it.g,
        platforms: it.p,
        rating: it.r,
        description: makeDescription(it.t, it.g),
        preferredCovers,
        fallbackCover
      };
    });
  }

  function makeDescription(title, genre) {
    return `${title} es un juego de ${genre.toLowerCase()} destacado por su excelente jugabilidad y atmósfera. Esta es una descripción de ejemplo para fines demostrativos.`;
  }

  function svgCover(title, color) {
    const safe = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const svg = `<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1280\" height=\"720\"><defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"${color}\"/><stop offset=\"100%\" stop-color=\"#0b1020\"/></linearGradient></defs><rect width=\"100%\" height=\"100%\" fill=\"url(#g)\"/><g font-family=\"Inter,Segoe UI,Arial\" font-size=\"56\" fill=\"white\" opacity=\"0.9\"><text x=\"50\" y=\"140\">🎮</text><text x=\"50\" y=\"220\">${safe}</text></g></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function toSlug(text) {
    return String(text)
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function setImageWithFallback(imgEl, candidates, fallbackSrc) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      imgEl.src = fallbackSrc;
      return;
    }
    let index = 0;
    imgEl.onerror = () => {
      index += 1;
      if (index < candidates.length) {
        imgEl.src = candidates[index];
      } else {
        imgEl.onerror = null;
        imgEl.src = fallbackSrc;
      }
    };
    imgEl.src = candidates[0];
  }
})();


