const fs = require('fs');
let code = fs.readFileSync('src/views/FormWizardView.tsx', 'utf8');

const target = `      <footer className="sticky bottom-6 z-40 w-full max-w-4xl mx-auto px-4">
        <div className="bg-deep rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/5 w-full">
          <div className="w-full p-4">
          <NavigationButtons
            currentStep={currentStep}
            onPrev={handlePrev}
            onNext={currentStep === 6 ? handleSubmit : handleNext}
            isLastStep={currentStep === 6}
            isSubmitting={isSubmitting}
          />
        </div>
      </footer>`;

const replacement = `      <footer className="sticky bottom-6 z-40 w-full max-w-4xl mx-auto px-4">
        <div className="bg-deep rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/5 w-full">
          <div className="w-full p-4">
            <NavigationButtons
              currentStep={currentStep}
              onPrev={handlePrev}
              onNext={currentStep === 6 ? handleSubmit : handleNext}
              isLastStep={currentStep === 6}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </footer>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/views/FormWizardView.tsx', code);
