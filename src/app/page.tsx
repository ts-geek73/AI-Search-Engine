import { ChatInterface } from "@/components/ChatInterface";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  return (
    <main className="grid grid-cols-1 md:grid-cols-[1fr_3fr] items-center gap-2 justify-center h-100vh">
      <Sidebar />
      <ChatInterface />
    </main>
  );
}
