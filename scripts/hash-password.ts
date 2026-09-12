import { hash } from "@node-rs/argon2";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const password = Buffer.concat(chunks).toString("utf8").replace(/\n$/, "");

  if (!password) {
    console.error("Usage: echo -n 'your-password' | pnpm auth:hash");
    process.exit(1);
  }

  const encoded = await hash(password);
  // Base64 so dotenv does not expand `$` in the argon2 encoded string.
  console.log(Buffer.from(encoded, "utf8").toString("base64"));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
