import { createContext, useContext } from 'react';

export interface WizardJumpContextValue {
  /** Jump to a field in the wizard, switching steps if needed, then scrolling to and highlighting the field. */
  jumpToField: (fieldKey: string) => void;
}

export const WizardJumpContext = createContext<WizardJumpContextValue>({
  jumpToField: () => {},
});

export const useWizardJump = () => useContext(WizardJumpContext);

export default WizardJumpContext;
