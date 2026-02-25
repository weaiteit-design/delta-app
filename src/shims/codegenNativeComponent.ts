// Web stub — codegenNativeComponent is a React Native Fabric API
// that has no meaning in the browser. Return a passthrough View so
// react-native-screens and react-native-gesture-handler can load
// without crashing during module initialisation.
import { View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function codegenNativeComponent<T>(
    _componentName: string,
    _options?: Record<string, unknown>
): any {
    return View as any;
}
