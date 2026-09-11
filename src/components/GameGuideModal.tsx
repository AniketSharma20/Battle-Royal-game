import React, { useState } from 'react';
import { X, Gamepad2, Shield, Crosshair, Radio, HelpCircle, Zap, Eye, Trophy } from 'lucide-react';

interface GameGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameGuideModal: React.FC<GameGuideModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState<'hindi' | 'english'>('english');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {language === 'english' ? 'How to Play (Tactical Combat Guide)' : 'गेम कैसे खेलें (पूर्ण गाइड)'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'english' ? 'Battle Royale Rules, Controls & Combat Strategy' : 'बैटल रॉयल के नियम, कंट्रोल्स और टिप्स'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="bg-slate-800 p-1 rounded-lg flex items-center text-xs font-mono">
              <button
                onClick={() => setLanguage('english')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  language === 'english'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hindi')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  language === 'hindi'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {language === 'hindi' ? (
            // HINDI INSTRUCTIONS
            <div className="space-y-6">
              {/* Mission Goal */}
              <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
                <Trophy className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-bold text-sm mb-1">लक्ष्य (Game Objective):</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    आप 14 कंप्यूटर बॉट्स के साथ एक विशाल युद्ध द्वीप (Island) पर हैं। आपका मुख्य लक्ष्य 
                    <span className="text-emerald-400 font-bold"> अंत तक जीवित रहना और सभी बॉट्स को खत्म करना है</span>। 
                    जो अंत तक जीवित रहता है, वही <span className="text-amber-400 font-bold">#1 Victory Royale</span> जीतता है!
                  </p>
                </div>
              </div>

              {/* Controls Grid */}
              <div>
                <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-3">
                  कंट्रोल्स (Keyboard & Mouse)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-emerald-400 font-mono font-bold">
                      W A S D
                    </span>
                    <div>
                      <div className="font-bold text-white">आगे, पीछे, दाएं, बाएं चलें</div>
                      <div className="text-slate-400 text-[11px]">Shift दबाकर तेज़ दौड़ें (Sprint)</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-sky-400 font-mono font-bold">
                      MOUSE
                    </span>
                    <div>
                      <div className="font-bold text-white">देखना और निशाना लगाना (Look/Aim)</div>
                      <div className="text-slate-400 text-[11px]">स्क्रीन पर क्लिक करके माउस लॉक करें</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-rose-400 font-mono font-bold">
                      Left Click
                    </span>
                    <div>
                      <div className="font-bold text-white">गोली चलाएं (Shoot Weapon)</div>
                      <div className="text-slate-400 text-[11px]">हथियार से फायर करने के लिए</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono font-bold">
                      Right Click
                    </span>
                    <div>
                      <div className="font-bold text-white">ज़ूम / स्कोप (Aim Down Sights)</div>
                      <div className="text-slate-400 text-[11px]">सटीक निशाना लगाने के लिए दबाए रखें</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-indigo-400 font-mono font-bold">
                      E
                    </span>
                    <div>
                      <div className="font-bold text-white">लूट और सामान उठाएं (Pick Loot)</div>
                      <div className="text-slate-400 text-[11px]">चमकते बक्सों के पास जाकर [E] दबाएं</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-yellow-400 font-mono font-bold">
                      R
                    </span>
                    <div>
                      <div className="font-bold text-white">गोलियां रीलोड करें (Reload)</div>
                      <div className="text-slate-400 text-[11px]">मैगज़ीन खाली होने पर गोली भरें</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-purple-400 font-mono font-bold">
                      1 • 2 • 3
                    </span>
                    <div>
                      <div className="font-bold text-white">हथियार बदलें (Switch Gun)</div>
                      <div className="text-slate-400 text-[11px]">1=राइफल, 2=शॉटगन, 3=स्नाइपर</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono font-bold">
                      SPACE
                    </span>
                    <div>
                      <div className="font-bold text-white">कूदें (Jump)</div>
                      <div className="text-slate-400 text-[11px]">बाधाओं और सीढ़ियों पर कूदने के लिए</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategic Tips */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  ज़रूरी रणनीतिक टिप्स (Survival Rules)
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Radio className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">तूफ़ान (The Storm) से बचें:</strong> स्क्रीन पर और मिनी-मैप पर नीला घेरा (Safe Zone) दिखता है। हर कुछ सेकंड में घेरा छोटा होता है। अगर आप बाहर रहेंगे तो आपकी जान हर सेकंड कम होगी।
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">शील्ड (Shield Armor):</strong> ज़मीन पर नीले रंग के शील्ड पोशन उठाएं (+50 Armor)। जब दुश्मन गोली मारता है, पहले शील्ड टूटती है फिर आपकी हेल्थ घटती है।
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Crosshair className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">कवर लें और गोली चलाएं:</strong> सीधे खुले में न खड़े रहें। दीवारों, कंटेनरों और पेड़ों के पीछे छिपकर दुश्मन पर वार करें।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // ENGLISH INSTRUCTIONS
            <div className="space-y-6">
              {/* Mission Goal */}
              <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
                <Trophy className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-bold text-sm mb-1">Game Objective:</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You are dropped onto a tactical combat island with 14 AI soldier combatants. Your goal is to 
                    <span className="text-emerald-400 font-bold"> eliminate remaining enemies and survive inside the shrinking safe zone</span>. 
                    The last surviving player claims the <span className="text-amber-400 font-bold">#1 Victory Royale</span>!
                  </p>
                </div>
              </div>

              {/* Controls Grid */}
              <div>
                <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-3">
                  Controls (Keyboard & Mouse)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-emerald-400 font-mono font-bold">
                      W A S D
                    </span>
                    <div>
                      <div className="font-bold text-white">Move Forward / Back / Strafe</div>
                      <div className="text-slate-400 text-[11px]">Hold [Shift] to sprint</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-sky-400 font-mono font-bold">
                      MOUSE
                    </span>
                    <div>
                      <div className="font-bold text-white">Look & Aim Pitch/Yaw</div>
                      <div className="text-slate-400 text-[11px]">Click viewport to lock mouse cursor</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-rose-400 font-mono font-bold">
                      Left Click
                    </span>
                    <div>
                      <div className="font-bold text-white">Fire Active Weapon</div>
                      <div className="text-slate-400 text-[11px]">Raycast ballistics with muzzle recoil</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-amber-400 font-mono font-bold">
                      Right Click
                    </span>
                    <div>
                      <div className="font-bold text-white">Aim Down Sights (ADS Zoom)</div>
                      <div className="text-slate-400 text-[11px]">Tighter bullet spread + sniper scope</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-indigo-400 font-mono font-bold">
                      E
                    </span>
                    <div>
                      <div className="font-bold text-white">Interact / Loot Pickup</div>
                      <div className="text-slate-400 text-[11px]">Press when near glowing crates</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-yellow-400 font-mono font-bold">
                      R
                    </span>
                    <div>
                      <div className="font-bold text-white">Reload Ammunition</div>
                      <div className="text-slate-400 text-[11px]">Refills magazine from reserve pool</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-purple-400 font-mono font-bold">
                      1 • 2 • 3
                    </span>
                    <div>
                      <div className="font-bold text-white">Switch Weapon Slots</div>
                      <div className="text-slate-400 text-[11px]">1=Rifle, 2=Shotgun, 3=Sniper</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-400 font-mono font-bold">
                      SPACE
                    </span>
                    <div>
                      <div className="font-bold text-white">Jump</div>
                      <div className="text-slate-400 text-[11px]">Hop over obstacles & terrain</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategic Tips */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Battle Royale Survival Tips
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <Radio className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">Watch The Storm:</strong> The blue circle on your radar is the safe zone. Whenever the storm timer reaches zero, the storm shrinks. Staying outside causes rapid health loss.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">Shield First:</strong> Pick up cyan shield potions (+50 Armor). Incoming enemy bullet damage depletes shield before health.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Crosshair className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-white">Take Cover:</strong> Use watchtowers, concrete barriers, and crates as cover while returning fire.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {language === 'hindi' ? 'गेम के अंदर कभी भी [H] दबाकर यह गाइड खोल सकते हैं' : 'Press [H] during match anytime to open this guide'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/30"
          >
            {language === 'hindi' ? 'समझ आ गया! खेलें' : 'Got it! Return to Game'}
          </button>
        </div>
      </div>
    </div>
  );
};
