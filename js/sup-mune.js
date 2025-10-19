document.addEventListener('DOMContentLoaded', function() {
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        const suppliersGrid = document.getElementById('suppliersGrid');

        gridBtn.addEventListener('click', function() {
            suppliersGrid.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        });

        listBtn.addEventListener('click', function() {
            suppliersGrid.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        });
    });