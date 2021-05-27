export const PROPERTY_NICKNAME = 'nickname';

export interface VideoQuality {
    name: string;
    width: number,
    height: number
}

/**
 * 320x240
 */
export const QVGA: VideoQuality = { name: 'QVGA', width: 320, height: 240 };
/**
 * 640x480
 */
export const VGA: VideoQuality = { name: 'VGA', width: 640, height: 480 };
/**
 * 1280x720
 */
export const HD: VideoQuality = { name: 'HD', width: 1280, height: 720 };
/**
 * 1920x1080
 */
export const FHD: VideoQuality = { name: 'FHD', width: 1920, height: 1080 };
/**
 * 4096x2160
 */
export const FourK: VideoQuality = { name: '4K', width: 4096, height: 2160 };

export const VideoQualities: Array<VideoQuality> = [QVGA, VGA, HD, FHD, FourK];