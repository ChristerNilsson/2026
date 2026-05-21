const amountInput = document.querySelector("#amount");
const stepInput = document.querySelector("#step");
const firstPrice = document.querySelector("#first-price");
const secondPrice = document.querySelector("#second-price");
const thirdPrice = document.querySelector("#third-price");

function roundUpToHundred(value) {
  return Math.ceil(value / 100) * 100;
}

function numberFrom(input) {
  return Number(input.value) || 0;
}

function update() {
  const amount = numberFrom(amountInput);
  const step = numberFrom(stepInput);
  const third = amount / 3;

  firstPrice.textContent = roundUpToHundred(third + step);
  secondPrice.textContent = roundUpToHundred(third);
  thirdPrice.textContent = roundUpToHundred(third - step);
}

amountInput.addEventListener("input", update);
stepInput.addEventListener("input", update);

update();
