if (typeof Chart !== "undefined") {
  const attendanceCtx = document.getElementById("attendanceChart");
  if (attendanceCtx && typeof attendanceData !== "undefined") {
    new Chart(attendanceCtx, {
      type: "doughnut",
      data: {
        labels: ["Present", "Absent"],
        datasets: [
          {
            data: [attendanceData.present || 0, attendanceData.absent || 0],
            backgroundColor: ["#4de2d8", "#ff6b6b"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: { color: "#eaf2ff" },
          },
        },
      },
    });
  }

  const feesCtx = document.getElementById("feesChart");
  if (feesCtx && typeof feesLabels !== "undefined" && typeof feesValues !== "undefined") {
    new Chart(feesCtx, {
      type: "bar",
      data: {
        labels: feesLabels,
        datasets: [
          {
            label: "Fees Due (₹)",
            data: feesValues,
            backgroundColor: "rgba(155, 123, 255, 0.7)",
            borderRadius: 8,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            labels: { color: "#eaf2ff" },
          },
        },
        scales: {
          x: {
            ticks: { color: "#eaf2ff" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
          y: {
            ticks: { color: "#eaf2ff" },
            grid: { color: "rgba(255,255,255,0.08)" },
          },
        },
      },
    });
  }
}

const markAllToggle = document.getElementById("markAllPresent");
if (markAllToggle) {
  markAllToggle.addEventListener("change", (event) => {
    const selects = document.querySelectorAll(".status-select");
    selects.forEach((select) => {
      if (event.target.checked) {
        select.value = "Present";
      }
    });
  });
}
