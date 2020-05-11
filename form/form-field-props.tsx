type Props<T> = {
    formId: string,
    value: T,
    errors?: readonly string [],
    onChange: (value: T) => void,
    onUpload: (event: any) => void,
}

export default Props
