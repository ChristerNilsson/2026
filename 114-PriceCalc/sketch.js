const amountInput = document.querySelector("#amount");
const stepInput = document.querySelector("#step");

const outputs = {
  gold: document.querySelector("#gold-price"),
  silver: document.querySelector("#silver-price"),
  bronze: document.querySelector("#bronze-price"),
  total: document.querySelector("#total-price")
};

function readNumber(input) {
  return Number.parseFloat(input.value) || 0;
}

function roundUpToHundred(value) {
  return Math.ceil(value / 100) * 100;
}

function formatKronor(value) {
  return `${value.toLocaleString("sv-SE")} kr`;
}

function calculatePrices(amount, step) {
  const base = amount / 3;
  const gold = roundUpToHundred(base + step);
  const silver = roundUpToHundred(base);
  const bronze = roundUpToHundred(base - step);

  return {
    gold,
    silver,
    bronze,
    total: gold + silver + bronze
  };
}

function render() {
  const prices = calculatePrices(readNumber(amountInput), readNumber(stepInput));

  outputs.gold.value = formatKronor(prices.gold);
  outputs.silver.value = formatKronor(prices.silver);
  outputs.bronze.value = formatKronor(prices.bronze);
  outputs.total.value = formatKronor(prices.total);
}

amountInput.addEventListener("input", render);
stepInput.addEventListener("input", render);

render();
