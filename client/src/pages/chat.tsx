import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, Send, Volume2, VolumeX, Mic, MicOff, Loader2,
  Sparkles, User, Trash2, Copy, CheckCheck, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SwadeshLogo } from "@/components/swadesh-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ParticleBackground } from "@/components/particle-background";
import { useTTS } from "@/lib/tts-context";
import { useSettings } from "@/lib/settings-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";
import { cn } from "@/lib/utils";

const CHAT_HISTORY_KEY = "swadesh-chat-history";

function loadHistory(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export default function Chat() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const initialQuery = new URLSearchParams(searchString).get("q") || "";
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory());
  const [input, setInput] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { speak, stop, isSpeaking } = useTTS();
  const { settings } = useSettings();

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Persist history
  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-100))); // keep last 100
  }, [messages]);

  // Auto-send initial query
  const hasSentInitial = useRef(false);
  useEffect(() => {
    if (initialQuery && messages.length === 0 && !hasSentInitial.current) {
      hasSentInitial.current = true;
      handleSend(initialQuery);
      setInput("");
    }
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", { message, personality: settings.personality });
      return res.json();
    },
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: () => toast({ title: "Failed to get response. Please try again.", variant: "destructive" }),
  });

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    chatMutation.mutate(messageText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    toast({ title: "Chat cleared" });
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({ title: "Voice input not supported in this browser", variant: "destructive" });
      return;
    }
    if (isListening) { setIsListening(false); return; }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = settings.language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setInput(transcript);
    };
    recognition.start();
  };

  const handleSpeak = (text: string) => { isSpeaking ? stop() : speak(text); };

  const suggestions = ["Explain quantum physics", "Write a Hindi poem", "Debug my code", "Translate to Tamil"];

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <ParticleBackground />

      <header className="fixed top-0 left-0 right-0 z-50 glassmorphism">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SwadeshLogo size="sm" animated={false} />
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearChat} className="gap-1 h-8 text-xs text-muted-foreground hover:text-destructive" data-testid="button-clear-chat">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 pt-20 pb-32" ref={scrollRef}>
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
              <div className="w-24 h-24 rounded-full tricolor-gradient-animated mb-6 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Swadesh AI</h2>
              <p className="text-muted-foreground max-w-md">
                Your intelligent Indian AI assistant. Ask me anything — from general knowledge to code help, study materials, translations, and more!
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {suggestions.map(s => (
                  <Button key={s} variant="outline" size="sm" onClick={() => handleSend(s)} className="text-xs" data-testid={`button-suggestion-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3 animate-slide-up", message.role === "user" ? "justify-end" : "justify-start")}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full tricolor-gradient flex-shrink-0 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <Card className={cn("max-w-[80%] p-4", message.role === "user"
                    ? "bg-gradient-to-br from-saffron-500 to-saffron-600 text-white border-0"
                    : "glassmorphism border-0"
                  )}>
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    {message.role === "assistant" && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleSpeak(message.content)} className="h-7 text-xs gap-1" data-testid={`button-speak-${message.id}`}>
                          {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          {isSpeaking ? "Stop" : "Listen"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyMessage(message.content, message.id)} className="h-7 text-xs gap-1" data-testid={`button-copy-${message.id}`}>
                          {copiedId === message.id ? <CheckCheck className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          {copiedId === message.id ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    )}
                  </Card>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-3 animate-slide-up">
                  <div className="w-8 h-8 rounded-full tricolor-gradient flex-shrink-0 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <Card className="p-4 glassmorphism border-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Swadesh AI is thinking...
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 glassmorphism p-4">
        <div className="container mx-auto max-w-3xl">
          <div className="relative flex gap-2">
            <div className="absolute -inset-1 bg-gradient-to-r from-saffron-500/30 via-transparent to-india-green-500/30 rounded-lg blur-sm" />
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="relative flex-1 min-h-[48px] max-h-32 resize-none bg-background/80 border-0"
              data-testid="input-chat"
            />
            <div className="relative flex gap-2">
              <Button variant="outline" size="icon" onClick={toggleVoiceInput}
                className={cn("h-12 w-12", isListening && "bg-destructive/20 border-destructive text-destructive")}
                data-testid="button-voice-input">
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button onClick={() => handleSend()} disabled={!input.trim() || chatMutation.isPending}
                className="h-12 w-12 bg-gradient-to-r from-saffron-500 to-india-green-500 hover:from-saffron-600 hover:to-india-green-600 border-0"
                data-testid="button-send">
                {chatMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">Powered by Swadesh AI • Created by Zaid Asim</p>
            <p className="text-xs text-muted-foreground">{input.length} chars</p>
          </div>
        </div>
      </div>
    </div>
  );
}
