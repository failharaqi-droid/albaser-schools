import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      },
      (error) => {
        // Silent error for scanning failures
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner on unmount", e));
    };
  }, [onScan]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10"
        >
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                <Scan className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">مسح الباركود</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-8">
            <div className="relative">
              <div id="reader" className="rounded-3xl overflow-hidden border-2 border-dashed border-blue-100 bg-gray-50 shadow-inner"></div>
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/30 blur-[1px] animate-pulse"></div>
            </div>
            <p className="text-center mt-6 text-gray-500 font-bold text-sm bg-blue-50 py-3 rounded-2xl">
              يرجى توجيه الكاميرا نحو الرمز للتعرف التلقائي
            </p>
          </div>
          
          <div className="p-8 bg-gray-50/50 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-[0.98]"
            >
              إلغاء العملية
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
