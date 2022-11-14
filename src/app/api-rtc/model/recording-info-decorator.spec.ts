import { RecordingInfoDecorator } from './recording-info-decorator';
import { RecordingInfo } from '@apirtc/apirtc';

describe('RecordingInfoDecorator', () => {
  it('should create an instance', () => {
    expect(new RecordingInfoDecorator({} as RecordingInfo, false)).toBeTruthy();
  });
});
