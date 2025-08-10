
import { useState, useCallback } from 'react';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/storage';

/**
 * A custom React hook that syncs state with localStorage.
 * This provides a way to persist state across browser sessions.
 * @param key The key to use in localStorage.
 * @param initialValue The initial value to use if nothing is in localStorage.
 * @returns A stateful value, and a function to update it.
 */
export default function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    return loadFromLocalStorage(key, initialValue);
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  // This is now stable as its dependency `key` is stable.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        // We use the functional update form of useState to get the previous value
        // and avoid including `storedValue` in the dependency array.
        setStoredValue(currentStoredValue => {
          const valueToStore =
            value instanceof Function ? value(currentStoredValue) : value;
          // Save to local storage
          saveToLocalStorage(key, valueToStore);
          return valueToStore;
        });
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.error(error);
      }
    },
    [key] // Now only depends on `key`, making the function stable.
  );

  return [storedValue, setValue];
}
