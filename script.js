document.addEventListener('DOMContentLoaded', () => {
    const productosListaDiv = document.getElementById('productos-lista');
    const errorMessageDiv = document.getElementById('error-message');
    const endpointList = 'http://localhost:8080/producto/list'; // Your endpoint to list products
    const endpointDelete = 'http://localhost:8080/producto/eliminar/'; // Your endpoint to delete a product

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(price);
    };

    const fetchProducts = () => {
        productosListaDiv.innerHTML = '<p>Cargando productos...</p>'; // Show loading message
        errorMessageDiv.style.display = 'none'; // Hide error message

        fetch(endpointList)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(productos => {
                productosListaDiv.innerHTML = ''; // Clear loading message

                if (productos.length === 0) {
                    productosListaDiv.innerHTML = '<p>No hay productos disponibles en este momento.</p>';
                    return;
                }

                productos.forEach(producto => {
                    const productoCard = document.createElement('div');
                    productoCard.classList.add('producto-card');

                    productoCard.innerHTML = `
                        <h2>${producto.nombre}</h2>
                        <p><strong>ID:</strong> ${producto.id}</p>
                        <p><strong>Descripción:</strong> ${producto.descripcion}</p>
                        <p><strong>Categoría:</strong> ${producto.categoria}</p>
                        <p><strong>Stock:</strong> ${producto.stock}</p>
                        <p class="precio"><strong>Precio:</strong> ${formatPrice(producto.precio)}</p>
                        ${producto.url_imagen ? `<img src="${producto.url_imagen}" alt="${producto.nombre}" style="max-width: 100%; height: auto; border-radius: 4px; margin-top: 10px;">` : ''}
                        
                        <div class="actions">
                            <a href="product-form.html?id=${producto.id}" class="btn-secondary">Modificar</a>
                            <button class="btn-danger delete-btn" data-id="${producto.id}">Eliminar</button>
                        </div>
                    `;
                    productosListaDiv.appendChild(productoCard);
                });

                // Attach event listeners for delete buttons AFTER they are added to the DOM
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const productId = event.target.dataset.id;
                        if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID: ${productId}?`)) {
                            deleteProduct(productId);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error al cargar los productos:', error);
                productosListaDiv.innerHTML = '';
                errorMessageDiv.style.display = 'block';
            });
    };

    const deleteProduct = (id) => {
        fetch(endpointDelete + id, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                // If the backend sends an error response (e.g., 404, 500)
                // Try to parse error message if available, otherwise default
                return response.json().catch(() => ({ message: 'Error desconocido al eliminar el producto.' }))
                               .then(err => { throw new Error(err.message || 'Error en la respuesta del servidor.'); });
            }
            // No need to parse JSON if backend returns 204 No Content
            console.log(`Producto con ID ${id} eliminado correctamente.`);
            fetchProducts(); // Reload the product list
        })
        .catch(error => {
            console.error('Error al eliminar el producto:', error);
            alert(`No se pudo eliminar el producto: ${error.message}`); // Show alert to user
        });
    };

    // Initial fetch when the page loads
    fetchProducts();
});