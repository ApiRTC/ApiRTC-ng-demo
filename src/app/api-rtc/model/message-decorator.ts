import { PROPERTY_NICKNAME } from './../../consts';

/**
 * To avoid accessing to data using methods in templates,
 * this decorator allows to access relevant attributes
 */
export class MessageDecorator {

    readonly nickname: string;
    readonly content: string;

    private message: any;

    constructor(message?: any, nickname?: string, content?: string) {
        if (message) {
            this.message = message;
            this.nickname = message.sender.getUserData().get(PROPERTY_NICKNAME);
            this.content = message.content;
        }
        else {
            this.nickname = nickname;
            this.content = content;
        }
    }

    /**
     * 
     * @param message 
     * @returns 
     */
    public static build(message: any): MessageDecorator {
        return new MessageDecorator(message);
    }

    public static buildWithoutMessage(nickname: string, content: string): MessageDecorator {
        return new MessageDecorator(null, nickname, content);
    }

    getMessage(): any {
        return this.message;
    }

}
