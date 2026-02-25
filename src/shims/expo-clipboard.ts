// Web shim for expo-clipboard
export async function setStringAsync(text: string): Promise<void> {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
    }
}

export async function getStringAsync(): Promise<string> {
    if (navigator.clipboard) {
        return navigator.clipboard.readText();
    }
    return '';
}
