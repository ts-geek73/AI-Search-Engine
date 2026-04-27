import { ChatInterface } from "@/components/ChatInterface";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  return (
    <main className="grid grid-cols-1 md:grid-cols-[1fr_3fr] items-stretch gap-4 p-4 h-[100dvh] w-full">
      <Sidebar />
      <ChatInterface />
    </main>
  );
}
