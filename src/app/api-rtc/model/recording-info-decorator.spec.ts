import { RecordingInfoDecorator } from './recording-info-decorator';

describe('RecordingInfoDecorator', () => {
  it('should create an instance', () => {
    expect(new RecordingInfoDecorator({}, false)).toBeTruthy();
  });
});
