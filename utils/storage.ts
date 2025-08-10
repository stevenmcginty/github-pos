

export function loadFromLocalStorage<T>(key: string, initialValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    // Check if item exists and is not 'undefined' to prevent parsing errors
    if (item && item !== 'undefined') {
      return JSON.parse(item);
    }
    return initialValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage`, error);
    return initialValue;
  }
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    const valueToStore = JSON.stringify(value);
    window.localStorage.setItem(key, valueToStore);
  } catch (error) {
    console.error(`Error saving ${key} to localStorage`, error);
  }
}
