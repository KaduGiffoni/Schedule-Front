using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Schedule.DTOs.KnowledgeBase.Requests;
using Schedule.Interfaces.KnowledgeBase;
using Schedule.Models.KnowledgeBase.Enums;
using System.Security.Claims;

namespace Schedule.Controllers.KnowledgeBase
{
    [ApiController]
    [Route("api/knowledge-base/articles")]
    [Authorize] // RB001: Apenas utilizadores autenticados acedem à Base
    public class KnowledgeArticlesController : ControllerBase
    {
        private readonly IKnowledgeBaseService _service;

        public KnowledgeArticlesController(IKnowledgeBaseService service)
        {
            _service = service;
        }

        /// <summary>
        /// Pesquisa artigos com paginação e suporte a Full-Text Search.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] string? searchTerm,
            [FromQuery] Guid? categoryId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            // RB013: Apenas artigos Published aparecem na pesquisa pública (se não for admin)
            var status = User.IsInRole("Administrator") ? (ArticleStatus?)null : ArticleStatus.Published;

            var result = await _service.SearchArticlesAsync(searchTerm, categoryId, null, status, pageNumber, pageSize, ct);
            return Ok(new { data = result.Articles, totalCount = result.TotalCount });
        }

        /// <summary>
        /// Obtém detalhes de um artigo pelo ID.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        {
            return Ok(await _service.GetArticleByIdAsync(id, ct));
        }

        /// <summary>
        /// Cria um novo procedimento operacional (RB002).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Editor,Administrator")]
        public async Task<IActionResult> Create(CreateKnowledgeArticleRequest request, CancellationToken ct)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var article = await _service.CreateArticleAsync(request, userId, ct);
            return CreatedAtAction(nameof(GetById), new { id = article.Id }, article);
        }

        /// <summary>
        /// Atualiza um artigo (gera nova versão - RB004).
        /// </summary>
        [HttpPut]
        [Authorize(Roles = "Editor,Administrator")]
        public async Task<IActionResult> Update(UpdateKnowledgeArticleRequest request, CancellationToken ct)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var article = await _service.UpdateArticleAsync(request, userId, ct);
            return Ok(article);
        }

        /// <summary>
        /// Exclusão lógica (Soft Delete - RB006).
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            await _service.SoftDeleteArticleAsync(id, userId, ct);
            return NoContent();
        }
    }
}