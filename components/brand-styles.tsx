type Brand = {
  primaryColor: string;
  accentColor: string;
};

export function BrandStyles({ brand }: { brand: Brand }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{--brand-primary:${brand.primaryColor};--brand-accent:${brand.accentColor};--ink:${brand.primaryColor};}`,
      }}
    />
  );
}
