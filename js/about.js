import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";

document.addEventListener('DOMContentLoaded', function() {
    const findBtn = document.getElementById('find-my-legislators-btn');
    if (findBtn) {
        findBtn.addEventListener('click', function() {
            if (typeof showLegislatorFinder === 'function') {
                showLegislatorFinder();
            } else {
                window.location.href = '/issues';
            }
        });
    }
});