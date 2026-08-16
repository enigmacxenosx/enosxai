/**
 * useBrowser — Enhanced Browser Interaction Hook
 * Supports web content extraction, link extraction, and web element interaction
 * Integrates with backend API for headless browser operations
 */
import { useState, useCallback, useEffect } from 'react';

export interface WebPageContent {
  title?: string;
  url: string;
  text: string;
  html?: string;
  links?: Array<{ href: string; text: string }>;
  metadata?: Record<string, string>;
}

export interface WebElement {
  selector: string;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
}

export interface BrowserAction {
  type: 'read_webpage' | 'extract_links' | 'click_element' | 'fill_form' | 'screenshot';
  url: string;
  selector?: string;
  fields?: Array<{ selector: string; value: string }>;
  /** Must only be true after the user has reviewed and approved a modifying web action. */
  approved?: boolean;
}

interface UseBrowserState {
  isLoading: boolean;
  error: string | null;
  lastContent: WebPageContent | null;
  lastLinks: Array<{ href: string; text: string }> | null;
}

// ── Shared browser state across all windows/panes ──────────────────────────
// Multiple consumers (workspace pane, computer Browser window) each call
// useBrowser(), which creates per-component React state. This module-level
// store keeps fetched results in one place so an action executed from the
// workspace pane visibly updates the computer's browser window, and vice
// versa. Subscribers re-render whenever shared state changes.
interface SharedBrowserState {
  isLoading: boolean;
  error: string | null;
  lastContent: WebPageContent | null;
  lastLinks: Array<{ href: string; text: string }> | null;
}
const sharedState: SharedBrowserState = {
  isLoading: false,
  error: null,
  lastContent: null,
  lastLinks: null,
};
const sharedSubscribers = new Set<() => void>();

function notifyShared() {
  sharedSubscribers.forEach((cb) => cb());
}

export function onBrowserStateChange(callback: () => void): () => void {
  sharedSubscribers.add(callback);
  return () => {
    sharedSubscribers.delete(callback);
  };
}

export function getSharedBrowserState(): SharedBrowserState {
  return sharedState;
}

function setSharedState(partial: Partial<SharedBrowserState>) {
  Object.assign(sharedState, partial);
  notifyShared();
}

export function useBrowser() {
  const [localState, setLocalState] = useState<UseBrowserState>(() => ({ ...sharedState }));

  // Mirror the shared store into this component's state so every consumer
  // sees results produced by any other consumer.
  useEffect(() => {
    const unsubscribe = onBrowserStateChange(() => {
      setLocalState({ ...sharedState });
    });
    return unsubscribe;
  }, []);

  const setState = setLocalState;
  const state = localState;

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  /**
   * Read webpage content from a given URL
   * Optionally extract specific elements using CSS selector
   */
  const readWebpage = useCallback(async (url: string, selector?: string): Promise<WebPageContent | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/browser/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector }),
      });

      if (!response.ok) {
        throw new Error(`Failed to read webpage: ${response.statusText}`);
      }

      const data: WebPageContent = await response.json();
      setSharedState({ lastContent: data, isLoading: false, error: null });
      setState(prev => ({ ...prev, lastContent: data, isLoading: false }));
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read webpage';
      setError(msg);
      setLoading(false);
      return null;
    }
  }, [setLoading, setError]);

  /**
   * Extract all links from a webpage
   */
  const extractLinks = useCallback(async (url: string): Promise<Array<{ href: string; text: string }> | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/browser/extract-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract links: ${response.statusText}`);
      }

      const data = await response.json();
      const links = data.links || [];
      setSharedState({ lastLinks: links, isLoading: false, error: null });
      setState(prev => ({ ...prev, lastLinks: links, isLoading: false }));
      return links;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to extract links';
      setError(msg);
      setLoading(false);
      return null;
    }
  }, [setLoading, setError]);

  /**
   * Click an element on a webpage
   */
  const clickElement = useCallback(async (url: string, selector: string, approved = false): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/browser/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector, approved }),
      });

      if (!response.ok) {
        throw new Error(`Failed to click element: ${response.statusText}`);
      }

      setLoading(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to click element';
      setError(msg);
      setLoading(false);
      return false;
    }
  }, [setLoading, setError]);

  /**
   * Fill form fields on a webpage
   */
  const fillForm = useCallback(async (url: string, fields: Array<{ selector: string; value: string }>, approved = false): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/browser/fill-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, fields, approved }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fill form: ${response.statusText}`);
      }

      setLoading(false);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fill form';
      setError(msg);
      setLoading(false);
      return false;
    }
  }, [setLoading, setError]);

  /**
   * Take a screenshot of a webpage
   */
  const screenshot = useCallback(async (url: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to take screenshot: ${response.statusText}`);
      }

      const data = await response.json();
      setLoading(false);
      return data.screenshotUrl || null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to take screenshot';
      setError(msg);
      setLoading(false);
      return null;
    }
  }, [setLoading, setError]);

  /**
   * Execute a custom browser action
   */
  const executeAction = useCallback(async (action: BrowserAction): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/browser/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute browser action: ${response.statusText}`);
      }

      const result = await response.json();
      setLoading(false);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to execute browser action';
      setError(msg);
      setLoading(false);
      return null;
    }
  }, [setLoading, setError]);

  return {
    isLoading: state.isLoading,
    error: state.error,
    lastContent: state.lastContent,
    lastLinks: state.lastLinks,
    readWebpage,
    extractLinks,
    clickElement,
    fillForm,
    screenshot,
    executeAction,
  };
}
