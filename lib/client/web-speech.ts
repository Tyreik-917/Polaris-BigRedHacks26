/** Browser Web Speech API fallback when Grok Voice is unavailable. */
export function listenOnceWithWebSpeech(
  onPartial?: (text: string) => void,
): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  type SpeechRecognitionCtor = new () => {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((ev: {
      results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
    }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };

  const ctor = (
    window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    }
  ).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor })
      .webkitSpeechRecognition;

  if (!ctor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const rec = new ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    let finalText = "";

    rec.onresult = (ev) => {
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const chunk = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      const live = (finalText + interim).trim();
      if (live) onPartial?.(live);
    };

    rec.onerror = () => resolve(finalText.trim() || null);
    rec.onend = () => resolve(finalText.trim() || null);
    rec.start();
  });
}
