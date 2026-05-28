async function run() {
  const email = "obsanhabtamu0@gmail.com";
  const url = `http://localhost:5000/api/auth/forgot-password/questions?email=${encodeURIComponent(email)}`;
  console.log("Fetching from:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    const body = await res.json();
    console.log("Body:", body);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
