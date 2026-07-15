using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedule.Interfaces.KnowledgeBase;
using System.Security.Claims;

namespace Schedule.Controllers.KnowledgeBase
{
    [ApiController]
    [Route("api/knowledge-base/interactions")]
    [Authorize] // RB001: Apenas utilizadores autenticados podem interagir
    public class KnowledgeInteractionsController : ControllerBase
    {
        private readonly IKnowledgeBaseService _service;

        public KnowledgeInteractionsController(IKnowledgeBaseService service)
        {
            _service = service;
        }

        /// <summary>
        /// Regista que o utilizador visualizou o artigo (RB015, RB024).
        /// </summary>
        [HttpPost("{articleId}/view")]
        public async Task<IActionResult> RegisterView(Guid articleId, CancellationToken ct)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            await _service.RegisterViewAsync(articleId, userId, ct);
            return Ok();
        }

        /// <summary>
        /// Alterna o estado de favorito do artigo para o utilizador (RB014, RB025).
        /// </summary>
        [HttpPost("{articleId}/favorite")]
        public async Task<IActionResult> ToggleFavorite(Guid articleId, CancellationToken ct)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            await _service.ToggleFavoriteAsync(articleId, userId, ct);
            return Ok();
        }

        /// <summary>
        /// Marca o artigo como lido/concluído pelo utilizador (RB032).
        /// Dispara a lógica de Gamificação.
        /// </summary>
        [HttpPost("{articleId}/read")]
        public async Task<IActionResult> MarkAsRead(Guid articleId, CancellationToken ct)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            await _service.MarkArticleAsReadAsync(articleId, userId, ct);
            return Ok();
        }
    }
}