const amountInput = document.querySelector("#amount");
const stepInput = document.querySelector("#step");
const goldPrice = document.querySelector("#gold-price");
const silverPrice = document.querySelector("#silver-price");
const bronzePrice = document.querySelector("#bronze-price");
const totalPrice = document.querySelector("#total-price");

function roundUpToHundred(value) {
  return Math.ceil(value / 100) * 100;
}

function numberFrom(input) {
  return Number(input.value) || 0;
}

function formatCurrency(value) {
  return `${value} kr`;
}

function update() {
  const amount = numberFrom(amountInput);
  const step = numberFrom(stepInput);
  const base = amount / 3;

  const gold = roundUpToHundred(base + step);
  const silver = roundUpToHundred(base);
  const bronze = roundUpToHundred(base - step);

  goldPrice.textContent = formatCurrency(gold);
  silverPrice.textContent = formatCurrency(silver);
  bronzePrice.textContent = formatCurrency(bronze);
  totalPrice.textContent = formatCurrency(gold + silver + bronze);
}

amountInput.addEventListener("input", update);
stepInput.addEventListener("input", update);

update();
