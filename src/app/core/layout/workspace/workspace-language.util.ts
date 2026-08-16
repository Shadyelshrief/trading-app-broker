const WORKSPACE_LANGUAGE_KEY = 'broker-workspace-language-v1';

export interface WorkspaceLanguageDocument {
  documentElement: {
    lang: string;
    dir: string;
    setAttribute(name: string, value: string): void;
  };
}

export function applyWorkspaceLanguage(
  language: string | undefined,
  targetDocument: WorkspaceLanguageDocument,
  storage?: Pick<Storage, 'setItem'>
): void {
  if (!language) {
    return;
  }

  targetDocument.documentElement.setAttribute('data-language-id', language);

  if (/^ar(?:-|$)/i.test(language)) {
    targetDocument.documentElement.lang = 'ar';
    targetDocument.documentElement.dir = 'rtl';
  } else if (/^[a-z]{2}(?:-|$)/i.test(language)) {
    targetDocument.documentElement.lang = language;
    targetDocument.documentElement.dir = 'ltr';
  }

  try {
    storage?.setItem(WORKSPACE_LANGUAGE_KEY, language);
  } catch {
    // Storage can be unavailable in privacy mode; the current document still updates.
  }
}

export function readWorkspaceLanguage(storage?: Pick<Storage, 'getItem'>): string | undefined {
  try {
    return storage?.getItem(WORKSPACE_LANGUAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
