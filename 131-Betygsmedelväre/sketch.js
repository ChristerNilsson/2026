const gradeValues = {
  A: 20,
  B: 17.5,
  C: 15,
  D: 12.5,
  E: 10,
  F: 0,
};

const input = document.querySelector("#grades");
const average = document.querySelector("#average");
const calculation = document.querySelector("#calculation");

function parseGrade(letter) {
  const upper = letter.toUpperCase();
  const value = gradeValues[upper];

  if (value === undefined) {
    return null;
  }

  return {
    letter,
    value,
    weight: letter === upper ? 1 : 0.5,
  };
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function updateAverage() {
  const grades = [...input.value].map(parseGrade).filter(Boolean);

  if (grades.length === 0) {
    average.textContent = "0";
    calculation.textContent = "Skriv betyg med bokstäverna A-F.";
    return;
  }

  const weightedValues = grades.map((grade) => grade.value * grade.weight);
  const weights = grades.map((grade) => grade.weight);
  const sum = weightedValues.reduce((total, value) => total + value, 0);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  const result = sum / totalWeight;
  const terms = weightedValues.map(formatNumber).join(" + ");
  const divisor = weights.map(formatNumber).join(" + ");

  average.textContent = formatNumber(result);
  calculation.textContent = `(${terms}) / (${divisor}) = ${formatNumber(sum)} / ${formatNumber(totalWeight)}`;
}

input.addEventListener("input", updateAverage);
updateAverage();
