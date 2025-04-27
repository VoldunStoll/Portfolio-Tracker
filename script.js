// Supabase Config
const SUPABASE_URL = 'https://rtplxllphixpqhkvsuop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cGx4bGxwaGl4cHFoa3ZzdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjQwMTUsImV4cCI6MjA2MDQwMDAxNX0.sLiS0__pFaxtKW1rE2H_6f9stti4CEVtdYQgUpJCN84'; 

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const landingPage = document.getElementById('landing-page');
const portfolioPage = document.getElementById('portfolio-page');
const authModal = document.getElementById('auth-modal');
const modalTitle = document.getElementById('modal-title');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');
const modalClose = document.getElementById('modal-close');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const githubLoginBtn = document.getElementById('github-login');
const logoutBtn = document.getElementById('logout');
const portfolioForm = document.getElementById('portfolio-form');
const portfolioList = document.getElementById('portfolio-list');
const totalValue = document.getElementById('total-value');

let authMode = 'login'; // or "register"
let userSession = null;
let portfolio = [];

// Ensure modal is hidden on page load
document.addEventListener('DOMContentLoaded', () => {
  authModal.classList.add('hidden');
});

// Check if user is logged in on page load
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    userSession = session;
    landingPage.classList.add('hidden');
    portfolioPage.classList.remove('hidden');
    loadPortfolio();
  } else {
    landingPage.classList.remove('hidden');
    portfolioPage.classList.add('hidden');
    authModal.classList.add('hidden'); // Ensure modal is hidden if not logged in
  }
}
checkSession();

// Open Modal for Login
loginBtn.addEventListener('click', () => {
  authMode = 'login';
  modalTitle.textContent = 'Login';
  authSubmit.textContent = 'Login with Email';
  authModal.classList.remove('hidden');
});

// Open Modal for Register
registerBtn.addEventListener('click', () => {
  authMode = 'register';
  modalTitle.textContent = 'Register';
  authSubmit.textContent = 'Register with Email';
  authModal.classList.remove('hidden');
});

// Close Modal
modalClose.addEventListener('click', () => {
  authModal.classList.add('hidden');
  authForm.reset();
});

// Handle Login/Register Form Submission
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value;
  const password = authPassword.value;

  let result;
  if (authMode === 'login') {
    result = await supabase.auth.signInWithPassword({ email, password });
  } else {
    result = await supabase.auth.signUp({ email, password });
  }

  if (result.error) {
    alert('Error: ' + result.error.message);
  } else {
    userSession = result.data.session || (await supabase.auth.getSession()).data.session;
    authModal.classList.add('hidden');
    landingPage.classList.add('hidden');
    portfolioPage.classList.remove('hidden');
    loadPortfolio();
  }
});

// GitHub Login
githubLoginBtn.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin, // Redirect back to your app
    },
  });
  if (error) {
    alert('GitHub login failed: ' + error.message);
  }
});

// Handle Auth State Changes (e.g., after OAuth redirect)
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    userSession = session;
    authModal.classList.add('hidden');
    landingPage.classList.add('hidden');
    portfolioPage.classList.remove('hidden');
    loadPortfolio();
  } else {
    landingPage.classList.remove('hidden');
    portfolioPage.classList.add('hidden');
    authModal.classList.add('hidden');
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  userSession = null;
  portfolio = [];
  portfolioList.innerHTML = '';
  totalValue.textContent = '$0.00';
  portfolioPage.classList.add('hidden');
  landingPage.classList.remove('hidden');
});

// Portfolio Logic
portfolioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const symbol = document.getElementById('coin-symbol').value.toUpperCase();
  const amount = parseFloat(document.getElementById('coin-amount').value);

  if (!symbol || isNaN(amount)) {
    alert('Please enter a valid symbol and amount.');
    return;
  }

  // Fetch price from CoinGecko API
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`
    );
    const data = await response.json();
    const price = data[symbol.toLowerCase()]?.usd;

    if (!price) {
      throw new Error('Coin not found');
    }

    portfolio.push({ symbol, amount, price });
    updatePortfolioUI();
    portfolioForm.reset();
  } catch (error) {
    alert('Error fetching coin price: ' + error.message);
  }
});

function updatePortfolioUI() {
  portfolioList.innerHTML = '';
  let total = 0;

  portfolio.forEach(({ symbol, amount, price }) => {
    const value = (amount * price).toFixed(2);
    const div = document.createElement('div');
    div.classList.add('coin-entry');
    div.textContent = `${symbol}: ${amount} coins, $${value}`;
    portfolioList.appendChild(div);
    total += parseFloat(value);
  });

  totalValue.textContent = `$${total.toFixed(2)}`;
}

function loadPortfolio() {
  // Optionally load portfolio from Supabase DB here in the future
  portfolio = [];
  updatePortfolioUI();
}
