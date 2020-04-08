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

    // console.log(uploadables)
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
        // console.log(m[key])
        m[key].sort()
        m[key].map((e:any) => {
            const [ind, file] = e
            // console.log(key, ind, file)
            formData.append(key, file)
        })
    })

    // Object.keys(uploadables).forEach(key => {
    //     if (Object.prototype.hasOwnProperty.call(uploadables, key)) {
    //         formData.append(key, uploadables[key]);
    //     }
    // });

    return formData;
}

function getRequestBodyWithoutUplodables(request: RequestParameters, variables: Variables) {
    return JSON.stringify({
        name: request.name, // used by graphql mock on tests
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




const fetchQuery = async (url: string, request: RequestParameters, variables: Variables, uploadables?: UploadableMap | null) => {
    try {
        const body = getRequestBody(request, variables, uploadables);
        const headers = {
            ...getHeaders(uploadables),
        };

        const response = await fetchWithRetries(url, {
            method: 'POST',
            headers,
            body,
            fetchTimeout: 20000,
            retryDelays: [1000, 3000, 5000],
        });

        const data = await handleData(response);

        if (response.status === 401) {
            throw data.errors;
        }

        if (isMutation(request) && data.errors) {
            throw data;
        }

        if (!data.data) {
            throw data.errors;
        }

        return data;
    } catch (err) {
        // eslint-disable-next-line
        console.log('err: ', err);

        const timeoutRegexp = new RegExp(/Still no successful response after/);
        const serverUnavailableRegexp = new RegExp(/Failed to fetch/);
        if (timeoutRegexp.test(err.message) || serverUnavailableRegexp.test(err.message)) {

            throw new Error('Unavailable service. Try again later.');
        }

        throw err;
    }
};

const oneMinute = 60 * 1000;
const queryResponseCache = new QueryResponseCache({ size: 250, ttl: oneMinute });

const cacheHandler = async (
    url: string,
    request: RequestParameters,
    variables: Variables,
    cacheConfig: CacheConfig,
    uploadables?: UploadableMap | null,
) => {
    const queryID = request.text!;
    
    if (isMutation(request)) {
        queryResponseCache.clear();
        return fetchQuery(url, request, variables, uploadables);
    }
    
    const fromCache = queryResponseCache.get(queryID, variables);
    if (isQuery(request) && fromCache !== null && !forceFetch(cacheConfig)) {
        return fromCache;
    }
    
    const fromServer = await fetchQuery(url, request, variables, uploadables);
    if (fromServer) {
        queryResponseCache.set(queryID, variables, fromServer);
    }
    
    return fromServer;
};

export default cacheHandler;
