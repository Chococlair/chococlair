import { useState, useEffect } from "react";
import { X, Share2, Plus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AddToHomeScreenTutorial = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Verificar se é iOS/Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    
    // Verificar se já foi mostrado antes
    const hasSeenTutorial = localStorage.getItem("hasSeenAddToHomeTutorial");
    
    // Mostrar apenas se:
    // 1. É iOS/Safari
    // 2. Não está em modo standalone (já adicionado)
    // 3. Ainda não viu o tutorial
    if ((isIOS || isSafari) && !isStandalone && !hasSeenTutorial) {
      // Pequeno delay para garantir que a página carregou
      setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
    }
  }, []);

  const handleClose = () => {
    setShowTutorial(false);
    localStorage.setItem("hasSeenAddToHomeTutorial", "true");
  };

  const handleDontShowAgain = () => {
    setShowTutorial(false);
    localStorage.setItem("hasSeenAddToHomeTutorial", "true");
    localStorage.setItem("dontShowAddToHomeTutorial", "true");
  };

  return (
    <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Adicione ao Ecrã Principal
          </DialogTitle>
          <DialogDescription className="text-foreground">
            Para uma experiência melhor, adicione o Chococlair ao seu ecrã principal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Passo 1 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium mb-1">
                Toque no botão de partilhar
              </p>
              <div className="flex items-center gap-2 text-foreground/70 text-sm">
                <Share2 className="h-4 w-4" />
                <span>Na barra inferior do Safari</span>
              </div>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium mb-1">
                Procure por "Adicionar ao Ecrã Principal"
              </p>
              <div className="flex items-center gap-2 text-foreground/70 text-sm">
                <Plus className="h-4 w-4" />
                <span>Ou "Adicionar à Tela Inicial"</span>
              </div>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium mb-1">
                Confirme a adição
              </p>
              <div className="flex items-center gap-2 text-foreground/70 text-sm">
                <Home className="h-4 w-4" />
                <span>O app aparecerá no seu ecrã principal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleClose} className="w-full">
            Entendi!
          </Button>
          <Button
            variant="ghost"
            onClick={handleDontShowAgain}
            className="w-full text-sm text-foreground/70"
          >
            Não mostrar novamente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

