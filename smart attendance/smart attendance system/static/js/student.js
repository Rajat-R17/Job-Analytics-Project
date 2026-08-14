if (typeof Chart !== "undefined") {
  const studentCtx = document.getElementById("studentAttendanceChart");
  if (studentCtx && typeof studentAttendance !== "undefined") {
    new Chart(studentCtx, {
      type: "pie",
      data: {
        labels: ["Present", "Absent"],
        datasets: [
          {
            data: [studentAttendance.present || 0, studentAttendance.absent || 0],
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
}
