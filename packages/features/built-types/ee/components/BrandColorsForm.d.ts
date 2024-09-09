/// <reference types="react" />
type BrandColorsFormValues = {
    brandColor: string;
    darkBrandColor: string;
};
declare const BrandColorsForm: ({ onSubmit, brandColor, darkBrandColor, }: {
    onSubmit: (values: BrandColorsFormValues) => void;
    brandColor: string | undefined;
    darkBrandColor: string | undefined;
}) => JSX.Element;
export default BrandColorsForm;
//# sourceMappingURL=BrandColorsForm.d.ts.map