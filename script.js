async function loadRecommendedProducts() {
    try {
        const response = await fetch("http://localhost:3000/api/recommended-products");
        const products = await response.json();

        console.log(products);
    } catch (error) {
        console.error("Could not load recommended products:", error);
    }
}

loadRecommendedProducts();