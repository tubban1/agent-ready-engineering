import Foundation
import AVFoundation
import CoreVideo
import CoreMedia
import CoreGraphics
import ImageIO

// Public evidence slides ONLY. No simulated footage is presented as a real Agent screen recording.
let args = CommandLine.arguments
guard args.count == 3 else { fatalError("Usage: swift are_s11_video.swift <slides-folder> <output.mp4>") }
let folder = URL(fileURLWithPath: args[1], isDirectory: true)
let output = URL(fileURLWithPath: args[2])
try? FileManager.default.removeItem(at: output)
let W=1080, H=1920, fps=10, slideSeconds=3
var images: [CGImage] = []
for i in 1...5 {
    let file=folder.appendingPathComponent(String(format:"%02d.png", i))
    guard let source=CGImageSourceCreateWithURL(file as CFURL,nil),
          let image=CGImageSourceCreateImageAtIndex(source,0,nil)
    else { fatalError("Unable to read verified slide: \(file.path)") }
    images.append(image)
}
let writer=try AVAssetWriter(outputURL:output,fileType:.mp4)
let input=AVAssetWriterInput(mediaType:.video,outputSettings:[
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W,
    AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey:2_000_000]
])
input.expectsMediaDataInRealTime=false
let attrs:[String:Any]=[
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
    kCVPixelBufferWidthKey as String:W,
    kCVPixelBufferHeightKey as String:H,
    kCVPixelBufferCGImageCompatibilityKey as String:true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String:true,
    kCVPixelBufferIOSurfacePropertiesKey as String:[:]
]
let adaptor=AVAssetWriterInputPixelBufferAdaptor(assetWriterInput:input,sourcePixelBufferAttributes:attrs)
writer.add(input)
guard writer.startWriting() else {fatalError("Writer start failed: \(String(describing:writer.error))")}
writer.startSession(atSourceTime:.zero)
guard let pool=adaptor.pixelBufferPool else {fatalError("Pixel buffer pool unavailable")}
for frame in 0..<(images.count*slideSeconds*fps) {
    while !input.isReadyForMoreMediaData {Thread.sleep(forTimeInterval:0.01)}
    var newBuffer:CVPixelBuffer?
    let status=CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault,pool,&newBuffer)
    guard status==kCVReturnSuccess, let pixel=newBuffer else {fatalError("Failed to create frame buffer \(status)")}
    CVPixelBufferLockBaseAddress(pixel,[])
    guard let ptr=CVPixelBufferGetBaseAddress(pixel),
          let ctx=CGContext(data:ptr,width:W,height:H,bitsPerComponent:8,
                            bytesPerRow:CVPixelBufferGetBytesPerRow(pixel),
                            space:CGColorSpaceCreateDeviceRGB(),
                            bitmapInfo:CGImageAlphaInfo.noneSkipFirst.rawValue)
    else {fatalError("Unable to draw evidence slide")}
    ctx.clear(CGRect(x:0,y:0,width:W,height:H))
    ctx.draw(images[frame/(slideSeconds*fps)],in:CGRect(x:0,y:0,width:W,height:H))
    CVPixelBufferUnlockBaseAddress(pixel,[])
    let t=CMTime(value:Int64(frame),timescale:Int32(fps))
    guard adaptor.append(pixel,withPresentationTime:t) else {
        fatalError("Failed to append video frame \(frame): \(String(describing:writer.error))")
    }
}
input.markAsFinished()
let semaphore=DispatchSemaphore(value:0)
writer.finishWriting {semaphore.signal()}
semaphore.wait()
guard writer.status == .completed else {
    fatalError("Video export failed: \(String(describing:writer.error))")
}
print("VIDEO_OK \(output.path) duration=\(images.count*slideSeconds)s fps=\(fps)")
