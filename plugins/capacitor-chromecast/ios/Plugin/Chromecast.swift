import Foundation

@objc public class Chromecast: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
