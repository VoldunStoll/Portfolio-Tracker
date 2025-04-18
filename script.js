
// ===== Supabase Config =====
const SUPABASE_URL = 'https://rtplxllphixpqhkvsuop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cGx4bGxwaGl4cHFoa3ZzdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjQwMTUsImV4cCI6MjA2MDQwMDAxNX0.sLiS0__pFaxtKW1rE2H_6f9stti4CEVtdYQgUpJCN84'; 

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DOM Elements =====
const authSection = document.getElementById('auth-section');
const portfolioSection = document.getElementById('portfolio-section');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const portfolioForm = document.getElementById('portfolio-form');
const symbolInput = document.getElementById('coin-symbol');
const amountInput = document.getElementById('coin-amount');
const portfolioList = document.getElementById('portfolio-list');
const totalValueDisplay = document.getElementById('total-value');

let currentUser = null;
let portfolio = [];
let coinListCache = [];

const nicknameMap = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL',
  cardano: 'ADA', binancecoin: 'BNB', ripple: 'XRP',
  dogecoin: 'DOGE', polkadot: 'DOT', litecoin: 'LTC',
  'shiba-inu': 'SHIB', pepe: 'PEPE'
};

// ===== Auth Functions =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert('Both fields required.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login failed: ' + error.message);

  currentUser = data.user;
  onLogin();
});

async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.href
    }
  });
  if (error) alert('GitHub login failed: ' + error.message);
}

async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  portfolio = [];
  authSection.classList.remove('hidden');
  portfolioSection.classList.add('hidden');
}

// Check session on load
supabase.auth.getUser().then(({ data: { user } }) => {
  if (user) {
    currentUser = user;
    onLogin();
  }
});

// ===== On Login =====
async function onLogin() {
  authSection.classList.add('hidden');
  portfolioSection.classList.remove('hidden');
  await loadPortfolio();
}

// ===== Portfolio Logic =====
portfolioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return alert('Please login.');

  const rawSymbol = symbolInput.value.trim();
  const amount = parseFloat(amountInput.value);
  if (!rawSymbol || isNaN(amount) || amount <= 0) return;

  const symbol = await resolveSymbol(rawSymbol.toUpperCase());
  if (!symbol) return alert(`Invalid coin: ${rawSymbol}`);

  await addOrUpdateCoin(symbol, amount);
  portfolioForm.reset();
});

async function resolveSymbol(input) {
  const symbol = input.toLowerCase();
  const fromMap = Object.entries(nicknameMap).find(([id, nick]) => nick === input);
  if (fromMap) return fromMap[0];

  if (!coinListCache.length) {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/list');
      coinListCache = await res.json();
    } catch (err) {
      console.error('Failed to fetch coin list:', err);
      return null;
    }
  }

  const match = coinListCache.find(coin => coin.symbol.toLowerCase() === symbol || coin.name.toLowerCase() === symbol);
  return match ? match.id : null;
}

async function addOrUpdateCoin(symbol, amount) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
    const data = await res.json();
    if (!data[symbol]) return alert(`Price not found for: '${symbol}'`);

    const price = data[symbol].usd;
    const existing = portfolio.find(c => c.symbol === symbol);

    if (existing) {
      existing.amount = amount;
      existing.price = price;
      existing.value = amount * price;
    } else {
      portfolio.push({ symbol, amount, price, value: amount * price });
    }

    await savePortfolio();
    renderPortfolio();
  } catch (err) {
    console.error('Add coin error:', err);
    alert('Error fetching price.');
  }
}

function renderPortfolio() {
  portfolioList.innerHTML = '';
  let total = 0;

  portfolio.forEach(({ symbol, amount, price, value }) => {
    total += value;
    const displaySymbol = nicknameMap[symbol] || symbol.toUpperCase();

    const item = document.createElement('div');
    item.className = 'portfolio-item';
    item.innerHTML = `
      <div>
        <div class="coin-name">${displaySymbol}</div>
        <div>${amount} @ $${price.toFixed(2)} = $${value.toFixed(2)}</div>
      </div>
      <div>
        <button onclick="editCoin('${symbol}')">Edit</button>
        <button onclick="removeCoin('${symbol}')">Remove</button>
      </div>
    `;
    portfolioList.appendChild(item);
  });

  totalValueDisplay.textContent = `$${total.toFixed(2)}`;
}

function editCoin(symbol) {
  const coin = portfolio.find(c => c.symbol === symbol);
  if (coin) {
    symbolInput.value = symbol;
    amountInput.value = coin.amount;
  }
}

async function removeCoin(symbol) {
  portfolio = portfolio.filter(c => c.symbol !== symbol);
  await savePortfolio();
  renderPortfolio();
}

async function savePortfolio() {
  if (!currentUser) return;
  await supabase.from('portfolios').delete().eq('user_id', currentUser.id);
  for (let coin of portfolio) {
    await supabase.from('portfolios').insert({
      user_id: currentUser.id,
      symbol: coin.symbol,
      amount: coin.amount
    });
  }
}

async function loadPortfolio() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', currentUser.id);

  if (data) {
    portfolio = data.map(item => ({
      symbol: item.symbol,
      amount: parseFloat(item.amount),
      price: 0,
      value: 0
    }));
    await refreshPrices();
  }
}

async function refreshPrices() {
  for (let coin of portfolio) {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.symbol}&vs_currencies=usd`);
      const data = await res.json();
      if (data[coin.symbol]) {
        coin.price = data[coin.symbol].usd;
        coin.value = coin.amount * coin.price;
      }
    } catch (err) {
      console.error(`Error updating ${coin.symbol}`, err);
    }
  }
  renderPortfolio();
  await savePortfolio();
}

setInterval(refreshPrices, 60000);
