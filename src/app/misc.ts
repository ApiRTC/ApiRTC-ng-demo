import { ValidatorFn, AbstractControl } from '@angular/forms';
export const REGEXP_MONGO_ID: RegExp = /^[a-z0-9]{24}$/;
export function mongoDbIdValidator(): ValidatorFn {
	return (control: AbstractControl): { [key: string]: any } | null => {
		const valid = REGEXP_MONGO_ID.test(control.value);
		return valid ? null : { 'invalidId': { value: control.value } };
	};
}

export class Error {
	public code: number;
	public reason: string;
	public data: any;

	public static toError(json: any): Error {
		if (json === null) {
			return new Error(-1, 'internal error');
		}
		return new Error(json.errorCode || -1, json.errorReason);
	}

	public static build(code: number, reason: string): Error {
		return new Error(code, reason);
	}

	public static map(error: Error, errorMapping: any): Error {
		let reason = errorMapping[error.code] || error.reason;
		return Error.build(error.code, reason);
	}

	constructor(code: number, reason: string) {
		this.code = code;
		this.reason = reason;
	}
	public setData(data: any) {
		this.data = data;
	}

	public getData(): any {
		return this.data;
	}
}

import { HttpErrorResponse } from '@angular/common/http';

export function handleError(response: HttpErrorResponse): Error {
	// In a real world app, we might use a remote logging infrastructure
	let errMsg: string;

	//if (response instanceof HttpErrorResponse) {
	try {
		const errObj = response.error instanceof Object ? response.error : JSON.parse(response.error);
		const error: Error = Error.build(errObj.errorCode || -1, errObj.errorReason);
		let data = new Object();
		for (let k in errObj) {
			if ((k !== 'errorCode') && (k !== 'errorReason')) {
				data[k] = errObj[k];
			}
		}
		error.setData(data);
		return error;
	} catch (e) {
		console.error('Misc::handleError|Exception : ' + e);
	}
	//            response.message ||
	const err = JSON.stringify(response);
	errMsg = `${response.status} - ${response.statusText || ''} ${err}`;
	//	} else {
	//		errMsg = response.message ? response.message : response.toString();
	//	}
	console.error('Misc::handleError|building error with' + errMsg);
	return Error.build(-1, errMsg);
}