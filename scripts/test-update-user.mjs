async function run() {
  const backendUrl = "http://localhost:5000";
  
  // 1. Log in as teacher
  console.log("Logging in as teacher...");
  let loginRes;
  try {
    loginRes = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "teacher@hamle.edu",
        password: "teacher123" // default seed password
      })
    });
  } catch (err) {
    console.error("Login fetch failed:", err);
    return;
  }
  
  if (!loginRes.ok) {
    console.error("Login failed:", loginRes.status, await loginRes.text());
    return;
  }
  
  const { token, user } = await loginRes.json();
  console.log("Logged in successfully! Token received. User ID:", user.id);
  
  // 2. Try to update security questions
  console.log("Updating security questions via PUT /api/users/:id...");
  const updatePayload = {
    email: "teacher@hamle.edu",
    recoveryEmail: "teacher@hamle.edu",
    securityQuestion1: "What is your favorite book?",
    securityAnswer1: "The Hobbit",
    securityQuestion2: "What was your first car?",
    securityAnswer2: "Toyota"
  };
  
  const updateRes = await fetch(`${backendUrl}/api/users/${user.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(updatePayload)
  });
  
  console.log("Update status:", updateRes.status);
  const updateBody = await updateRes.json();
  console.log("Update body response:", updateBody);
}

run();
