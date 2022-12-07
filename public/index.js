"use strict";
const inputs = document.getElementsByName("address");

inputs.forEach(input => {
  input.onkeydown = async (event) => {
    if (event.code == "Enter") {
      goTo(input.value.trim());
    }
  }
});