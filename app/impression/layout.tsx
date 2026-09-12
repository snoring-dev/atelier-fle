import "./print.css";

export default function ImpressionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="impression-root">{children}</div>;
}
