import {RequestParameters, QueryResponseCache, Variables, UploadableMap, CacheConfig } from 'relay-runtime';
import fetchWithRetries from './fetch-with-retries';

export const isMutation = (request: RequestParameters) => request.operationKind === 'mutation';
export const isQuery = (request: RequestParameters) => request.operationKind === 'query';
export const forceFetch = (cacheConfig: CacheConfig) => !!(cacheConfig && cacheConfig.force);


export const handleData = (response: any) => {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1) {
        return response.json();
    }

    return response.text();
};

function getRequestBodyWithUploadables(request: RequestParameters, variables: Variables, uploadables: UploadableMap) {
    let formData = new FormData();
    formData.append('name', request.name);
    formData.append('query', request.text!);
    formData.append('variables', JSON.stringify(variables));

    const m:any = {}
    Object.keys(uploadables).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(uploadables, key)) {
            const li = key.lastIndexOf('[')
            if (li < 0) {
                m[key] = [[0, uploadables[key]]]
            } else {
                const nk = key.substring(0, li)
                const ind = parseInt(key.slice(key.lastIndexOf('[') + 1, -1), 10)
                if (!(nk in m)) {
                    m[nk] = []
                }
                m[nk].push([ind, uploadables[key]])
            }
        }
    });

    Object.keys(m).forEach(key => {
        m[key].sort()
        m[key].map((e:any) => {
            formData.append(key, e[1])
        })
    })

    return formData;
}

function getRequestBodyWithoutUplodables(request: RequestParameters, variables: Variables) {
    return JSON.stringify({
        name: request.name,  // used by graphql mock on tests
        query: request.text, // GraphQL text from input
        variables,
    });
}

export function getRequestBody(request: RequestParameters, variables: Variables, uploadables?: UploadableMap | null) {
    if (uploadables) {
        return getRequestBodyWithUploadables(request, variables, uploadables);
    }

    return getRequestBodyWithoutUplodables(request, variables);
}

export const getHeaders = (uploadables?: UploadableMap | null) : Record<string, string> => {
    if (uploadables) {
        return {
            Accept: '*/*',
        };
    }

    return {
        Accept: 'application/json',
        'Content-type': 'application/json',
    };
};




const fetchQuery = async (url: string, request: RequestParameters,
                          variables: Variables, uploadables: UploadableMap | null | undefined,
                          getRequestInit: (() => Omit<RequestInit, "body">) | undefined,
                          fetchTimeout: number, retryDelays: number[]) => {
    try {
        let _method: string = 'POST'
        let _headers: HeadersInit = {}
        let _other_options: Omit<RequestInit, "method" | "body" | "headers"> = {}
        if (getRequestInit != null) {
            const {method, headers, ...other_options} = getRequestInit()
            if (!(method == null)) {
                _method = method
            }
            if (!(headers == null)) {
                _headers = headers
            }
            _other_options = other_options
        }
        const body = getRequestBody(request, variables, uploadables);
        const headers = {
            ..._headers,
            ...getHeaders(uploadables),
        };

        const response = await fetchWithRetries(url, {
            method: _method,
            headers,
            body,
            fetchTimeout: fetchTimeout,
            retryDelays: retryDelays,
            ..._other_options
        });

        const data = await handleData(response);

        // TODO: handle multiple error
        if (response.status === 401) {
            throw data.errors[0];
        }

        if (isMutation(request) && data.errors) {
            throw data.errors[0];
        }

        if (!data.data) {
            if (data.errors == null || data.errors?.length == 0) {
                throw Error("Unknown Error occurred")
            }
            throw data.errors[0]
        }

        return data;
    } catch (err) {
        // eslint-disable-next-line
        console.error('err: ', err);
        if (err == null) {
            throw new Error('Unavailable service. Try again later.');
        }

        const timeoutRegexp = new RegExp(/Still no successful response after/);
        const serverUnavailableRegexp = new RegExp(/Failed to fetch/);
        if (timeoutRegexp.test(err.message) || serverUnavailableRegexp.test(err.message)) {
            throw new Error('Unavailable service. Try again later.');
        }

        throw err;
    }
};

const oneMinute = 5 * 60 * 1000;
const queryResponseCache = new QueryResponseCache({ size: 250, ttl: oneMinute });

const cacheHandler = async (
    url: string,
    request: RequestParameters,
    variables: Variables,
    cacheConfig: CacheConfig,
    uploadables: UploadableMap | null | undefined,
    getRequestInit: (() => Omit<RequestInit, "body">) | undefined,
) => {
    const queryID = request.text!;

    if (isMutation(request)) {
        queryResponseCache.clear();
        return fetchQuery(url, request, variables, uploadables, getRequestInit, 90000, []);
    }
    
    const fromCache = queryResponseCache.get(queryID, variables);
    if (isQuery(request) && fromCache !== null && !forceFetch(cacheConfig)) {
        return fromCache;
    }
    
    const fromServer = await fetchQuery(url, request, variables, uploadables, getRequestInit, 90000, [10000, 20000, 50000]);
    if (fromServer) {
        queryResponseCache.set(queryID, variables, fromServer);
    }
    
    return fromServer;
};

export default cacheHandler;
