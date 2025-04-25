// Supabase Config
const SUPABASE_URL = 'https://rtplxllphixpqhkvsuop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0cGx4bGxwaGl4cHFoa3ZzdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjQwMTUsImV4cCI6MjA2MDQwMDAxNX0.sLiS0__pFaxtKW1rE2H_6f9stti4CEVtdYQgUpJCN84'; 

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM elements
const loginPage = document.getElementById("login-page");
const portfolioPage = document.getElementById("portfolio-page");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const toggleText = document.getElementById("toggle-text");
const toggleModeBtn = document.getElementById("toggle-mode");
const githubLoginBtn = document.getElementById("github-login");
const logoutBtn = document.getElementById("logout");
const portfolioForm = document.getElementById("portfolio-form");
const portfolioList = document.getElementById("portfolio-list");
const totalValue = document.getElementById("total-value");

let authMode = "login"; // or "register"
let userSession = null;
let portfolio = [];

// Toggle between login/register
toggleModeBtn.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  authSubmit.textContent = authMode === "login" ? "Login with Email" : "Register Account";
  toggleModeBtn.textContent = authMode === "login" ? "Register here" : "Login here";
  toggleText.firstChild.textContent = authMode === "login" ? "Don't have an account? " : "Already have an account? ";
});

// Email Login/Register
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = authEmail.value;
  const password = authPassword.value;

  let result;
  if (authMode === "login") {
    result = await supabase.auth.signInWithPassword({ email, password });
  } else {
    result = await supabase.auth.signUp({ email, password });
  }

  if (result.error) {
    alert(result.error.message);
  } else {
    userSession = result.data.session || (await supabase.auth.getSession()).data.session;
    showPortfolioPage();
  }
});

// GitHub login
githubLoginBtn.addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: "https://rtplxllphixpqhkvsuop.supabase.co/auth/v1/callback"
    }
  });
});

// Auth state change
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    userSession = session;
    showPortfolioPage();
  }
});

// Show portfolio
function showPortfolioPage() {
  loginPage.classList.add("hidden");
  portfolioPage.classList.remove("hidden");
  loadPortfolio();
}

// Logout
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  userSession = null;
  portfolio = [];
  portfolioList.innerHTML = '';
  totalValue.textContent = '$0.00';
  loginPage.classList.remove("hidden");
  portfolioPage.classList.add("hidden");
});

// Portfolio Logic
portfolioForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const symbol = document.getElementById("coin-symbol").value.toUpperCase();
  const amount = parseFloat(document.getElementById("coin-amount").value);

  if (!symbol || isNaN(amount)) return;

  portfolio.push({ symbol, amount });
  updatePortfolioUI();
  portfolioForm.reset();
});

function updatePortfolioUI() {
  portfolioList.innerHTML = "";
  let total = 0;

  portfolio.forEach(({ symbol, amount }) => {
    const div = document.createElement("div");
    div.classList.add("coin-entry");
    div.textContent = `${symbol}: ${amount}`;
    portfolioList.appendChild(div);
    // Fake price = $100 for now
    total += amount * 100;
  });

  totalValue.textContent = `$${total.toFixed(2)}`;
}

function loadPortfolio() {
  // You could load user's saved portfolio from Supabase DB here
  portfolio = [];
  updatePortfolioUI();
}
