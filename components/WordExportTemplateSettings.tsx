import React, { useRef, useState } from "react";
import {
  WordTemplateConfig,
  WordLabelLang,
  loadWordTemplate,
  saveWordTemplate,
  clearWordTemplate,
} from "../utils/wordExportTemplate";
import { useT } from "../utils/i18n";

const LOGO_MAX_DIM = 400;

/**
 * Downscale the logo to at most 400px on its longest side before storing, so
 * the base64 data URL stays well under the localStorage quota and every
 * exported .docx stays small. Returns the original when already small enough.
 */
const downscaleLogo = (dataUrl: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, LOGO_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const isJpeg = /^data:image\/jpe?g;/.test(dataUrl);
      resolve(isJpeg ? canvas.toDataURL("image/jpeg", 0.85) : canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });

const WordExportTemplateSettings: React.FC = () => {
  const t = useT();
  const DEFAULT_FOOTER_PREVIEW = t.ui.wordTemplate.noDefaultFooter;
  const [template, setTemplate] = useState<WordTemplateConfig>(() => loadWordTemplate());
  const [logoPreview, setLogoPreview] = useState<string | null>(template.logoDataUrl ?? null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Persist a change; returns false when storage is full/unavailable. */
  const update = (patch: Partial<WordTemplateConfig>): boolean => {
    const next = { ...template, ...patch };
    const saved = saveWordTemplate(next);
    setTemplate(next);
    return saved;
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setLogoError(t.ui.wordTemplate.logoFormatError);
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const original = String(reader.result);
      downscaleLogo(original)
        .then((dataUrl) => {
          setLogoPreview(dataUrl);
          if (!update({ logoDataUrl: dataUrl })) {
            setLogoError(t.ui.wordTemplate.logoStorageError);
          }
        })
        .catch(() => {
          // Canvas unavailable — fall back to the original image
          setLogoPreview(original);
          update({ logoDataUrl: original });
        });
    };
    reader.onerror = () => setLogoError(t.ui.wordTemplate.logoReadError);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoError(null);
    update({ logoDataUrl: null });
  };

  const resetAll = () => {
    clearWordTemplate();
    setTemplate({});
    setLogoPreview(null);
    setLogoError(null);
  };

  const footerText = template.footerText ?? "";
  const labelLang: WordLabelLang = template.labelLang ?? "en";

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-cream rounded-xl shadow-sm border border-hairline p-5">
        <h3 className="font-bold text-text text-sm mb-1">{t.ui.wordTemplate.companyLogo}</h3>
        <p className="text-xs text-latte mb-3">{t.ui.wordTemplate.companyLogoHint}</p>
        {logoPreview ? (
          <div className="flex items-center gap-4">
            <img
              src={logoPreview}
              alt={t.ui.wordTemplate.companyLogo}
              className="h-16 w-auto object-contain border border-hairline rounded-lg bg-white p-2"
            />
            <button
              onClick={removeLogo}
              className="flex items-center gap-1 bg-cream-2 text-text hover:bg-cream-3 font-bold py-1.5 px-3 rounded-lg transition-colors text-sm border border-hairline"
            >
              {t.ui.wordTemplate.removeLogo}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-hover transition-colors shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {t.ui.wordTemplate.chooseLogo}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleLogoFile}
          className="hidden"
        />
        {logoError && <p className="text-xs text-red-600 mt-2">{logoError}</p>}
      </div>

      {/* Custom footer */}
      <div className="bg-cream rounded-xl shadow-sm border border-hairline p-5">
        <h3 className="font-bold text-text text-sm mb-1">{t.ui.wordTemplate.customFooter}</h3>
        <p className="text-xs text-latte mb-3">{t.ui.wordTemplate.customFooterHint}</p>
        <input
          type="text"
          value={footerText}
          onChange={(e) => update({ footerText: e.target.value })}
          placeholder={t.ui.wordTemplate.footerPlaceholder}
          className="w-full bg-white border border-hairline rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-latte mt-2">
          {t.ui.wordTemplate.previewColon} {footerText.trim() ? footerText : DEFAULT_FOOTER_PREVIEW}
        </p>
      </div>

      {/* Label language */}
      <div className="bg-cream rounded-xl shadow-sm border border-hairline p-5">
        <h3 className="font-bold text-text text-sm mb-1">{t.ui.wordTemplate.reportLabelLang}</h3>
        <p className="text-xs text-latte mb-3">{t.ui.wordTemplate.reportLabelLangHint}</p>
        <div className="flex gap-2">
          <button
            onClick={() => update({ labelLang: "en" })}
            className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors text-sm ${
              labelLang === "en" ? "bg-primary text-white" : "bg-cream-2 text-text hover:bg-cream-3 border border-hairline"
            }`}
          >
            English
          </button>
          <button
            onClick={() => update({ labelLang: "ar" })}
            className={`flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors text-sm ${
              labelLang === "ar" ? "bg-primary text-white" : "bg-cream-2 text-text hover:bg-cream-3 border border-hairline"
            }`}
          >
            {t.ui.wordTemplate.arabic}
          </button>
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button
          onClick={resetAll}
          className="flex items-center gap-1 bg-cream-2 text-text hover:bg-cream-3 font-bold py-2 px-4 rounded-lg transition-colors text-sm border border-hairline"
        >
          {t.ui.wordTemplate.resetDefaults}
        </button>
      </div>
    </div>
  );
};

export default WordExportTemplateSettings;
