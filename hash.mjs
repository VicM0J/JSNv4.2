import bcrypt from "bcrypt";

bcrypt.hash("adminjsn25", 10)
  .then((hash) => {
    console.log("Hashed password:", hash);
  })
  .catch(console.error);
